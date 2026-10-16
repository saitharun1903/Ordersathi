import "server-only";
import type { JobStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { lookupUnitWord } from "@/lib/units";
import { normalizeText } from "@/lib/normalize";
import { env } from "../env";
import { log } from "../logger";
import { AppError } from "../errors";
import { getObject } from "../storage";
import { getProviders } from "../ai";
import { rulesExtractor, detectLanguage } from "../ai/demo";
import { ExtractionSchema, ProviderError, type Extraction, type Lang } from "../ai/types";
import { loadMatchCatalogue } from "./catalogue-load";
import { matchLine } from "./match";
import { recomputeOrder, type LineExtracted } from "./recompute";

// Slightly longer than the 300 s function limit, so a killed run is only retried after it is truly dead.
const LEASE_MS = 330 * 1000;
export const MAX_ATTEMPTS = 3;

async function setStage(jobId: string, stage: JobStage) {
  await prisma.processingJob.update({ where: { id: jobId }, data: { stage } });
}

/**
 * Runs one processing job end to end. Safe to call more than once: a lease
 * prevents concurrent runs, and results are only applied if this job is still
 * the latest one for its order and the order is still open.
 */
export async function runJob(jobId: string) {
  const now = new Date();
  const claimed = await prisma.processingJob.updateMany({
    where: {
      id: jobId,
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "QUEUED" }, { status: "RUNNING", leaseUntil: { lt: now } }],
    },
    data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: now, leaseUntil: new Date(now.getTime() + LEASE_MS), errorCode: null, errorMessage: null },
  });
  if (claimed.count === 0) {
    // A job whose worker died after its last allowed attempt is closed out instead of retried forever.
    await prisma.processingJob.updateMany({
      where: { id: jobId, status: "RUNNING", leaseUntil: { lt: now }, attempts: { gte: MAX_ATTEMPTS } },
      data: { status: "FAILED", errorCode: "TIMEOUT", errorMessage: "Processing didn’t finish after several attempts. Retry, or type the order into the transcript.", retryable: true, finishedAt: now, leaseUntil: null },
    });
    return;
  }

  const started = Date.now();
  let workspaceId = "";
  let orderId = "";
  try {
    const job = await prisma.processingJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { order: true, sourceUpload: true },
    });
    workspaceId = job.workspaceId;
    orderId = job.orderId;
    const providers = getProviders();
    const lang = job.order.inputLanguage as Lang;
    const timeoutMs = env().PROVIDER_TIMEOUT_MS;

    // 1–2. Transcribe audio / read image (skipped for text and for reprocessing an edited transcript)
    let transcript = job.order.transcript ?? job.order.sourceText ?? "";
    let providerId = "";
    if (job.kind === "INTAKE" && job.order.inputType !== "TEXT") {
      const upload = job.sourceUpload;
      if (!upload?.storageKey || upload.purgedAt) {
        throw new ProviderError("PROVIDER_ERROR", "The original file is no longer available.", false);
      }
      await setStage(jobId, "TRANSCRIBING");
      const bytes = await getObject(upload.storageKey);
      const input = { bytes, mimeType: upload.mimeType ?? "", sha256: upload.sha256 ?? "", language: lang, signal: AbortSignal.timeout(timeoutMs) };
      if (job.order.inputType === "AUDIO") {
        transcript = (await providers.transcriber.transcribe(input)).text;
        providerId = providers.transcriber.id;
      } else {
        transcript = (await providers.imageReader.readImage(input)).text;
        providerId = providers.imageReader.id;
      }
      transcript = transcript.slice(0, env().MAX_TEXT_CHARS);
      // Save the transcript immediately so it is kept even if extraction fails.
      await prisma.order.update({ where: { id: job.orderId }, data: { transcript, transcriptDirty: false } });
    }

    if (!transcript.trim()) throw new ProviderError("EMPTY_RESULT", "There is no order text to process.", false);

    // 3. Structured extraction (AI when configured, otherwise deterministic rules)
    await setStage(jobId, "EXTRACTING");
    const catalogue = await loadMatchCatalogue(prisma, job.workspaceId);
    const extractor = job.provider === "rules" ? rulesExtractor : providers.extractor;
    const raw = await extractor.extract({
      text: transcript,
      language: lang,
      catalogue: catalogue.map((c) => ({ sku: c.sku, name: c.name })),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const extraction: Extraction = (() => {
      const parsed = ExtractionSchema.safeParse(raw);
      if (!parsed.success) throw new ProviderError("MALFORMED_RESPONSE", "The extraction result was not in the expected format.", true);
      return parsed.data;
    })();

    // 4–6. Match against this workspace's catalogue, then price & validate.
    await setStage(jobId, "MATCHING");
    const bySku = new Map(catalogue.map((c) => [c.sku.toLowerCase(), c.id]));
    const lines = extraction.lines.map((l, i) => {
      const unitHit = l.unit ? lookupUnitWord(l.unit.trim().split(/\s+/)[0]) : null;
      const unit = unitHit?.known ? unitHit.unit : null;
      const unitRecognized = !l.unit || (unitHit?.known === true && unitHit.unit !== null);
      const specs = Object.fromEntries(l.specs.map((s) => [s.name.toLowerCase(), s.value]));
      // Only SKUs that exist in this workspace survive; anything else is discarded.
      const aiIds = l.candidate_skus.map((s) => bySku.get(s.toLowerCase())).filter((x): x is string => !!x);
      const description = extractor.id === "rules" ? l.description : normalizeText(`${l.brand ?? ""} ${l.description}`);
      const m = matchLine(
        {
          description,
          originalText: l.original_text,
          brand: l.brand,
          specs,
          requestedUnit: unit,
          customerId: job.order.customerId,
          aiSuggestedProductIds: aiIds,
        },
        catalogue,
      );
      const extracted: LineExtracted = {
        note: m.note,
        method: m.method,
        unitRecognized,
        brand: l.brand,
        specs,
        source: extractor.id === "rules" ? "rules" : "ai",
      };
      return {
        position: i,
        originalText: l.original_text.slice(0, 500),
        description: l.description.slice(0, 300),
        quantity: l.quantity === null ? null : String(Math.round(l.quantity * 1000) / 1000),
        unit,
        rawUnit: l.unit,
        productId: m.productId,
        candidates: m.candidates as unknown as Prisma.InputJsonValue,
        extracted: extracted as unknown as Prisma.InputJsonValue,
      };
    });
    // Drop chatter that neither states a quantity nor resembles any catalogue item.
    const kept = lines.filter((l) => l.quantity !== null || l.productId || (l.candidates as unknown[]).length > 0);

    await setStage(jobId, "PRICING");
    const applied = await prisma.$transaction(async (tx) => {
      const latest = await tx.processingJob.findFirst({ where: { orderId: job.orderId }, orderBy: { createdAt: "desc" }, select: { id: true } });
      const order = await tx.order.findUnique({ where: { id: job.orderId }, select: { status: true } });
      if (latest?.id !== jobId || !order || order.status === "APPROVED" || order.status === "REJECTED") return false;
      await tx.orderLine.deleteMany({ where: { orderId: job.orderId } });
      if (kept.length) {
        await tx.orderLine.createMany({ data: kept.map((l, i) => ({ ...l, position: i, orderId: job.orderId })) });
      }
      await tx.order.update({
        where: { id: job.orderId },
        data: {
          transcript,
          transcriptDirty: false,
          detectedLanguage: extraction.detected_language === "other" ? detectLanguage(transcript) : extraction.detected_language,
          version: { increment: 1 },
        },
      });
      await recomputeOrder(tx, job.workspaceId, job.orderId);
      await tx.processingJob.update({
        where: { id: jobId },
        data: {
          status: "SUCCEEDED",
          stage: "SAVED",
          finishedAt: new Date(),
          leaseUntil: null,
          transcript,
          extraction: extraction as unknown as Prisma.InputJsonValue,
          provider: [providerId, extractor.id].filter(Boolean).join(" + "),
          model: extractor.model ?? null,
        },
      });
      await tx.auditEvent.create({
        data: {
          workspaceId: job.workspaceId,
          orderId: job.orderId,
          actorName: "OrderSathi",
          type: job.kind === "INTAKE" ? "order.processed" : "order.reprocessed",
          data: { lines: kept.length, extractor: extractor.id },
        },
      });
      return true;
    }, { timeout: 30_000, maxWait: 10_000 });
    if (!applied) {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { status: "FAILED", errorCode: "SUPERSEDED", errorMessage: "A newer processing run replaced this one.", retryable: false, finishedAt: new Date(), leaseUntil: null },
      });
    }
    log.info("job.finished", { jobId, workspaceId, ms: Date.now() - started, lines: kept.length, applied });
  } catch (err) {
    const pe =
      err instanceof ProviderError
        ? err
        : err instanceof AppError
          ? new ProviderError("PROVIDER_ERROR", err.message, false)
          : new ProviderError("PROVIDER_ERROR", "Processing failed unexpectedly. Please retry.", true);
    if (!(err instanceof ProviderError)) log.error("job.crashed", { jobId, name: err instanceof Error ? err.name : "unknown" });
    try {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { status: "FAILED", errorCode: pe.code, errorMessage: pe.safeMessage, retryable: pe.retryable, finishedAt: new Date(), leaseUntil: null },
      });
      if (workspaceId) {
        await prisma.auditEvent.create({
          data: { workspaceId, orderId, actorName: "OrderSathi", type: "order.processing_failed", data: { code: pe.code } },
        });
      }
    } catch {
      log.error("job.fail_record_failed", { jobId });
    }
    log.warn("job.failed", { jobId, workspaceId, code: pe.code, ms: Date.now() - started });
  }
}

/** For `after()` callbacks: never let a background failure become an unhandled rejection. */
export function runJobSafely(jobId: string) {
  return runJob(jobId).catch((e) => log.error("job.unhandled", { jobId, name: e instanceof Error ? e.name : "unknown" }));
}
