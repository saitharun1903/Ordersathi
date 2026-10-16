import "server-only";
import type { InputType, Language, Order, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { REQUEST_UNITS } from "@/lib/units";
import type { Ctx } from "../context";
import { AppError, conflict, notFound } from "../errors";
import { assertCan } from "../permissions";
import { audit } from "../audit";
import { env } from "../env";
import { deleteObject, putObject, validateUpload } from "../storage";
import { recomputeOrder, type LineExtracted } from "./recompute";
import { effectivePrices } from "./catalogue-load";

type Tx = Prisma.TransactionClient;

// ───────────────────────── Intake ─────────────────────────

export const IntakeSchema = z.object({
  idempotencyKey: z.string().min(8).max(80),
  inputType: z.enum(["TEXT", "AUDIO", "IMAGE"]),
  inputLanguage: z.enum(["AUTO", "EN", "TE"]).default("AUTO"),
  customerId: z.string().max(40).nullish(),
  text: z.string().max(20000).nullish(),
});

export async function assertProcessingBudget(ctx: Ctx) {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await prisma.processingJob.count({ where: { workspaceId: ctx.workspaceId, createdAt: { gte: since } } });
  if (recent >= env().PROCESSING_LIMIT_PER_10_MIN) {
    throw new AppError("RATE_LIMITED", "Too many orders are being processed right now. Please wait a few minutes and try again.");
  }
}

async function assertCustomer(db: Tx | typeof prisma, ctx: Ctx, customerId: string | null | undefined) {
  if (!customerId) return null;
  const c = await db.customer.findFirst({ where: { id: customerId, workspaceId: ctx.workspaceId, archivedAt: null }, select: { id: true } });
  if (!c) throw new AppError("VALIDATION", "Choose a customer from this workspace.", { customerId: "Unknown customer" });
  return c.id;
}

export async function createIntake(
  ctx: Ctx,
  raw: z.input<typeof IntakeSchema>,
  file?: { bytes: Buffer; name: string } | null,
): Promise<{ orderId: string; jobId: string | null; deduped: boolean }> {
  assertCan(ctx.role, "order.create");
  const input = IntakeSchema.parse(raw);

  const existing = await prisma.order.findUnique({
    where: { workspaceId_idempotencyKey: { workspaceId: ctx.workspaceId, idempotencyKey: input.idempotencyKey } },
    include: { jobs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (existing) return { orderId: existing.id, jobId: existing.jobs[0]?.id ?? null, deduped: true };

  const customerId = await assertCustomer(prisma, ctx, input.customerId);
  let text: string | null = null;
  if (input.inputType === "TEXT") {
    text = (input.text ?? "").trim();
    if (!text) throw new AppError("VALIDATION", "Paste or type the order message.", { text: "Required" });
    if (text.length > env().MAX_TEXT_CHARS) throw new AppError("VALIDATION", `Messages are limited to ${env().MAX_TEXT_CHARS} characters.`, { text: "Too long" });
  } else if (!file) {
    throw new AppError("VALIDATION", input.inputType === "AUDIO" ? "Attach or record a voice note." : "Attach a photo of the list.", { file: "Required" });
  }

  await assertProcessingBudget(ctx);

  let stored: { key: string; sha256: string; mimeType: string; size: number } | null = null;
  if (file && input.inputType !== "TEXT") {
    const v = validateUpload(input.inputType, file.bytes);
    const put = await putObject(ctx.workspaceId, v.ext, file.bytes);
    stored = { ...put, mimeType: v.mimeType, size: file.bytes.length };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.update({ where: { id: ctx.workspaceId }, data: { orderSeq: { increment: 1 } }, select: { orderSeq: true } });
      const upload = await tx.sourceUpload.create({
        data: {
          workspaceId: ctx.workspaceId,
          kind: input.inputType as InputType,
          storageKey: stored?.key ?? null,
          mimeType: stored?.mimeType ?? "text/plain",
          sizeBytes: stored?.size ?? text?.length ?? null,
          sha256: stored?.sha256 ?? null,
          originalName: file?.name?.slice(0, 200) ?? null,
          createdById: ctx.userId,
        },
      });
      const order = await tx.order.create({
        data: {
          workspaceId: ctx.workspaceId,
          number: ws.orderSeq,
          customerId,
          inputType: input.inputType as InputType,
          inputLanguage: input.inputLanguage as Language,
          sourceText: text,
          transcript: text,
          sourceUploadId: upload.id,
          idempotencyKey: input.idempotencyKey,
          createdById: ctx.userId,
        },
      });
      const job = await tx.processingJob.create({
        data: { workspaceId: ctx.workspaceId, orderId: order.id, sourceUploadId: upload.id, kind: "INTAKE", createdById: ctx.userId },
      });
      await audit(tx, ctx, "order.created", { inputType: input.inputType }, order.id);
      return { orderId: order.id, jobId: job.id, deduped: false };
    });
  } catch (err) {
    if (stored) await deleteObject(stored.key).catch(() => {});
    // Lost a race with an identical submission — return the winner.
    if ((err as { code?: string }).code === "P2002") {
      const winner = await prisma.order.findUnique({
        where: { workspaceId_idempotencyKey: { workspaceId: ctx.workspaceId, idempotencyKey: input.idempotencyKey } },
        include: { jobs: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (winner) return { orderId: winner.id, jobId: winner.jobs[0]?.id ?? null, deduped: true };
    }
    throw err;
  }
}

/** Re-queue a failed job. Only retryable failures can be retried. */
export async function retryJob(ctx: Ctx, jobId: string, opts: { useRules?: boolean } = {}) {
  assertCan(ctx.role, "order.edit");
  const job = await prisma.processingJob.findFirst({ where: { id: jobId, workspaceId: ctx.workspaceId }, include: { order: { select: { status: true, inputType: true } } } });
  if (!job) throw notFound("Processing job");
  if (job.status !== "FAILED") throw new AppError("INVALID_STATE", "This job is not in a failed state.");
  if (job.order.status === "APPROVED" || job.order.status === "REJECTED") throw new AppError("INVALID_STATE", "This order is closed.");
  if (!job.retryable && !opts.useRules) throw new AppError("INVALID_STATE", "Retrying won't help for this failure. Edit the transcript and reprocess instead.");
  if (opts.useRules && job.order.inputType !== "TEXT" && job.kind === "INTAKE") {
    throw new AppError("INVALID_STATE", "The rule-based parser works on text. Type the transcript first.");
  }
  await assertProcessingBudget(ctx);
  const updated = await prisma.processingJob.updateMany({
    where: { id: jobId, status: "FAILED" },
    // A manual retry starts a fresh set of attempts.
    data: { status: "QUEUED", stage: "STORED", attempts: 0, errorCode: null, errorMessage: null, finishedAt: null, provider: opts.useRules ? "rules" : job.provider },
  });
  if (!updated.count) throw conflict("This job was already retried.");
  await prisma.auditEvent.create({
    data: { workspaceId: ctx.workspaceId, orderId: job.orderId, actorId: ctx.userId, actorName: ctx.userName, type: "order.retry", data: { useRules: !!opts.useRules } },
  });
  return { jobId };
}

// ───────────────────────── Mutations on open orders ─────────────────────────

async function mutate<T>(
  ctx: Ctx,
  orderId: string,
  version: number,
  fn: (tx: Tx, order: Order) => Promise<T>,
  opts: { repriceAll?: boolean; auditType: string; auditData?: Record<string, unknown> },
): Promise<T> {
  assertCan(ctx.role, "order.edit");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, workspaceId: ctx.workspaceId } });
    if (!order) throw notFound("Order");
    if (order.status === "APPROVED" || order.status === "REJECTED") {
      throw new AppError("INVALID_STATE", `This order is ${order.status.toLowerCase()} and can no longer be edited.`);
    }
    await assertNotProcessing(tx, orderId);
    const claimed = await tx.order.updateMany({ where: { id: orderId, version }, data: { version: { increment: 1 } } });
    if (!claimed.count) throw conflict();
    const result = await fn(tx, order);
    await recomputeOrder(tx, ctx.workspaceId, orderId, { repriceAll: opts.repriceAll });
    await audit(tx, ctx, opts.auditType, opts.auditData ?? {}, orderId);
    return result;
  }, TX_OPTS);
}

// Interactive transactions recompute every line; allow for database round-trip latency.
const TX_OPTS = { timeout: 20_000, maxWait: 10_000 };

/** Edits made while a processing job runs would be overwritten when it finishes. */
async function assertNotProcessing(tx: Tx, orderId: string) {
  const running = await tx.processingJob.count({ where: { orderId, status: { in: ["QUEUED", "RUNNING"] } } });
  if (running) throw new AppError("INVALID_STATE", "This order is still being processed. Wait for it to finish, then make changes.");
}

const QuantitySchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d{1,7}(\.\d{1,3})?$/.test(v), "Enter a number with up to 3 decimals")
  .refine((v) => Number(v) > 0, "Quantity must be more than zero");

const UnitSchema = z.enum(REQUEST_UNITS).nullable();

export const LinePatchSchema = z.object({
  productId: z.string().max(40).optional(),
  quantity: QuantitySchema.nullable().optional(),
  unit: UnitSchema.optional(),
  acceptPrice: z.literal(true).optional(),
});

async function assertProduct(tx: Tx, ctx: Ctx, productId: string) {
  const p = await tx.product.findFirst({ where: { id: productId, workspaceId: ctx.workspaceId }, select: { id: true, archivedAt: true, name: true } });
  if (!p) throw new AppError("VALIDATION", "That product is not in this workspace's catalogue.");
  if (p.archivedAt) throw new AppError("VALIDATION", `${p.name} is archived.`);
  return p;
}

export async function updateLine(ctx: Ctx, orderId: string, version: number, lineId: string, rawPatch: z.input<typeof LinePatchSchema>) {
  const patch = LinePatchSchema.parse(rawPatch);
  return mutate(
    ctx,
    orderId,
    version,
    async (tx) => {
      const line = await tx.orderLine.findFirst({ where: { id: lineId, orderId } });
      if (!line) throw notFound("Line");
      const ex = (line.extracted ?? {}) as LineExtracted;
      const data: Prisma.OrderLineUncheckedUpdateInput = { manuallyEdited: true };
      if (patch.productId !== undefined) {
        await assertProduct(tx, ctx, patch.productId);
        data.productId = patch.productId;
        data.unitPricePaise = null; // re-priced from the database during recompute
        data.priceSource = null;
        ex.note = null;
      }
      if (patch.quantity !== undefined) data.quantity = patch.quantity;
      if (patch.unit !== undefined) {
        data.unit = patch.unit;
        ex.unitRecognized = true;
      }
      if (patch.acceptPrice) {
        if (!line.productId) throw new AppError("VALIDATION", "Choose a product first.");
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { customerId: true } });
        const price = (await effectivePrices(tx, ctx.workspaceId, order.customerId, [line.productId])).get(line.productId);
        if (!price) throw new AppError("VALIDATION", "No price is available for this product.");
        data.unitPricePaise = price.paise;
        data.priceSource = price.source;
      }
      data.extracted = ex as unknown as Prisma.InputJsonValue;
      await tx.orderLine.update({ where: { id: line.id }, data });
    },
    { auditType: "line.updated", auditData: { lineId, fields: Object.keys(patch) } },
  );
}

export const AddLineSchema = z.object({
  productId: z.string().max(40).nullable().optional(),
  quantity: QuantitySchema.nullable().optional(),
  unit: UnitSchema.optional(),
});

export async function addLine(ctx: Ctx, orderId: string, version: number, raw: z.input<typeof AddLineSchema>) {
  const input = AddLineSchema.parse(raw);
  return mutate(
    ctx,
    orderId,
    version,
    async (tx) => {
      if (input.productId) await assertProduct(tx, ctx, input.productId);
      const max = await tx.orderLine.aggregate({ where: { orderId }, _max: { position: true } });
      const line = await tx.orderLine.create({
        data: {
          orderId,
          position: (max._max.position ?? -1) + 1,
          originalText: "Added by staff",
          productId: input.productId ?? null,
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
          manuallyEdited: true,
          extracted: { source: "manual", unitRecognized: true } as Prisma.InputJsonValue,
        },
      });
      return line.id;
    },
    { auditType: "line.added" },
  );
}

export async function removeLine(ctx: Ctx, orderId: string, version: number, lineId: string) {
  return mutate(
    ctx,
    orderId,
    version,
    async (tx) => {
      const r = await tx.orderLine.deleteMany({ where: { id: lineId, orderId } });
      if (!r.count) throw notFound("Line");
    },
    { auditType: "line.removed", auditData: { lineId } },
  );
}

export async function setCustomer(ctx: Ctx, orderId: string, version: number, customerId: string | null) {
  return mutate(
    ctx,
    orderId,
    version,
    async (tx) => {
      const id = await assertCustomer(tx, ctx, customerId);
      await tx.order.update({ where: { id: orderId }, data: { customerId: id } });
    },
    { repriceAll: true, auditType: "order.customer_set", auditData: { customerId } },
  );
}

export async function updateTranscript(ctx: Ctx, orderId: string, version: number, transcript: string) {
  const t = transcript.slice(0, env().MAX_TEXT_CHARS);
  return mutate(
    ctx,
    orderId,
    version,
    async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { transcript: t, transcriptDirty: true } });
    },
    { auditType: "order.transcript_edited" },
  );
}

/** Explicit, user-initiated reprocessing of the (possibly edited) transcript. */
export async function reprocessOrder(ctx: Ctx, orderId: string, version: number, transcript?: string) {
  assertCan(ctx.role, "order.edit");
  await assertProcessingBudget(ctx);
  return mutate(
    ctx,
    orderId,
    version,
    async (tx, order) => {
      const t = (transcript ?? order.transcript ?? "").slice(0, env().MAX_TEXT_CHARS);
      if (!t.trim()) throw new AppError("VALIDATION", "The transcript is empty — type the order first.");
      const running = await tx.processingJob.count({ where: { orderId, status: { in: ["QUEUED", "RUNNING"] } } });
      if (running) throw new AppError("INVALID_STATE", "This order is already being processed.");
      await tx.order.update({ where: { id: orderId }, data: { transcript: t } });
      const job = await tx.processingJob.create({
        data: { workspaceId: ctx.workspaceId, orderId, kind: "REPROCESS", createdById: ctx.userId },
      });
      return { jobId: job.id };
    },
    { auditType: "order.reprocess_requested" },
  );
}

// ───────────────────────── Approval ─────────────────────────

export type ApprovedSnapshot = {
  approvedAt: string;
  approvedBy: { id: string; name: string };
  number: number;
  createdAt: string;
  customer: { name: string; contactName: string | null; phone: string | null; city: string | null } | null;
  business: { name: string; city: string; state: string; addressLine: string | null; phone: string | null; gstin: string | null; isDemo: boolean };
  lines: {
    sku: string;
    name: string;
    brand: string | null;
    specs: Record<string, string>;
    quantity: string;
    unit: string | null;
    sellQuantity: string;
    sellingUnit: string;
    unitPricePaise: number;
    priceSource: string | null;
    lineTotalPaise: number;
    originalText: string;
  }[];
  subtotalPaise: number;
  taxPaise: number;
  taxRateBps: number | null;
  taxLabel: string | null;
  totalPaise: number;
};

export async function approveOrder(ctx: Ctx, orderId: string, version: number) {
  assertCan(ctx.role, "order.approve");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, workspaceId: ctx.workspaceId } });
    if (!order) throw notFound("Order");
    if (order.status === "APPROVED") {
      // Idempotent: a second approval is a no-op that creates no new events.
      return { alreadyApproved: true as const, approvedAt: order.approvedAt };
    }
    if (order.status === "REJECTED") throw new AppError("INVALID_STATE", "Rejected orders can't be approved.");
    await assertNotProcessing(tx, orderId);
    if (order.transcriptDirty) throw new AppError("INVALID_STATE", "The transcript was edited but not reprocessed. Reprocess it (or discard the edit) before approving.");
    const claimed = await tx.order.updateMany({ where: { id: orderId, version }, data: { version: { increment: 1 } } });
    if (!claimed.count) throw conflict();

    // Re-evaluate against current prices right before approving.
    const fresh = await recomputeOrder(tx, ctx.workspaceId, orderId);
    if (!fresh || fresh.status !== "READY_FOR_REVIEW") {
      throw new AppError("INVALID_STATE", "This order still has unresolved items or no customer. Resolve them before approving.");
    }
    const full = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        lines: { orderBy: { position: "asc" }, include: { product: true } },
        customer: true,
        workspace: true,
      },
    });
    const now = new Date();
    const snapshot: ApprovedSnapshot = {
      approvedAt: now.toISOString(),
      approvedBy: { id: ctx.userId, name: ctx.userName },
      number: full.number,
      createdAt: full.createdAt.toISOString(),
      customer: full.customer
        ? { name: full.customer.name, contactName: full.customer.contactName, phone: full.customer.phone, city: full.customer.city }
        : null,
      business: {
        name: full.workspace.name,
        city: full.workspace.city,
        state: full.workspace.state,
        addressLine: full.workspace.addressLine,
        phone: full.workspace.phone,
        gstin: full.workspace.gstin,
        isDemo: full.workspace.isDemo,
      },
      lines: full.lines.map((l) => ({
        sku: l.product!.sku,
        name: l.product!.name,
        brand: l.product!.brand,
        specs: l.product!.specs as Record<string, string>,
        quantity: l.quantity!.toString(),
        unit: l.unit,
        sellQuantity: l.sellQuantity!.toString(),
        sellingUnit: l.product!.sellingUnit,
        unitPricePaise: l.unitPricePaise!,
        priceSource: l.priceSource,
        lineTotalPaise: l.lineTotalPaise!,
        originalText: l.originalText,
      })),
      subtotalPaise: full.subtotalPaise,
      taxPaise: full.taxPaise,
      taxRateBps: full.taxRateBps,
      taxLabel: full.workspace.taxLabel,
      totalPaise: full.totalPaise,
    };
    const done = await tx.order.updateMany({
      where: { id: orderId, status: "READY_FOR_REVIEW" },
      data: {
        status: "APPROVED",
        approvedAt: now,
        approvedById: ctx.userId,
        approvedSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    if (!done.count) throw conflict();
    await audit(tx, ctx, "order.approved", { totalPaise: full.totalPaise }, orderId);
    return { alreadyApproved: false as const, approvedAt: now };
  }, TX_OPTS);
}

export async function rejectOrder(ctx: Ctx, orderId: string, version: number, reason: string) {
  assertCan(ctx.role, "order.reject");
  const r = reason.trim();
  if (r.length < 3) throw new AppError("VALIDATION", "Give a short reason for rejecting.", { reason: "Required" });
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, workspaceId: ctx.workspaceId } });
    if (!order) throw notFound("Order");
    if (order.status === "APPROVED" || order.status === "REJECTED") throw new AppError("INVALID_STATE", `This order is already ${order.status.toLowerCase()}.`);
    const done = await tx.order.updateMany({
      where: { id: orderId, version },
      data: { status: "REJECTED", rejectedAt: new Date(), rejectedById: ctx.userId, rejectionReason: r.slice(0, 500), version: { increment: 1 } },
    });
    if (!done.count) throw conflict();
    await audit(tx, ctx, "order.rejected", { reason: r.slice(0, 500) }, orderId);
  });
}

export async function reopenOrder(ctx: Ctx, orderId: string, version: number) {
  assertCan(ctx.role, "order.reject");
  return prisma.$transaction(async (tx) => {
    const done = await tx.order.updateMany({
      where: { id: orderId, workspaceId: ctx.workspaceId, version, status: "REJECTED" },
      data: { status: "DRAFT", rejectedAt: null, rejectedById: null, rejectionReason: null, version: { increment: 1 } },
    });
    if (!done.count) throw conflict("This order can't be reopened — reload to see its latest state.");
    await recomputeOrder(tx, ctx.workspaceId, orderId);
    await audit(tx, ctx, "order.reopened", {}, orderId);
  });
}

// ───────────────────────── Clarifications & sharing ─────────────────────────

export async function recordClarification(ctx: Ctx, orderId: string, message: string, rawStatus: "DRAFT" | "COPIED" | "SHARED") {
  assertCan(ctx.role, "order.edit");
  const status = z.enum(["DRAFT", "COPIED", "SHARED"]).parse(rawStatus);
  const order = await prisma.order.findFirst({ where: { id: orderId, workspaceId: ctx.workspaceId }, select: { id: true } });
  if (!order) throw notFound("Order");
  const text = message.trim().slice(0, 4000);
  if (!text) throw new AppError("VALIDATION", "The message is empty.");
  return prisma.$transaction(async (tx) => {
    const c = await tx.clarification.create({ data: { workspaceId: ctx.workspaceId, orderId, message: text, status, createdById: ctx.userId } });
    await audit(tx, ctx, status === "SHARED" ? "clarification.opened_in_whatsapp" : status === "COPIED" ? "clarification.copied" : "clarification.saved", {}, orderId);
    return c.id;
  });
}

export async function recordShare(ctx: Ctx, orderId: string, rawChannel: "COPY" | "WHATSAPP" | "PDF") {
  assertCan(ctx.role, "order.view");
  const channel = z.enum(["COPY", "WHATSAPP", "PDF"]).parse(rawChannel);
  const order = await prisma.order.findFirst({ where: { id: orderId, workspaceId: ctx.workspaceId }, select: { id: true, status: true } });
  if (!order) throw notFound("Order");
  if (order.status !== "APPROVED") throw new AppError("INVALID_STATE", "Only approved orders can be shared.");
  await prisma.auditEvent.create({
    data: { workspaceId: ctx.workspaceId, orderId, actorId: ctx.userId, actorName: ctx.userName, type: `confirmation.${channel.toLowerCase()}`, data: {} },
  });
}
