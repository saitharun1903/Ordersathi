import "server-only";
import { prisma } from "@/lib/db";
import type { Ctx } from "../context";
import { notFound } from "../errors";
import { assertCan, can } from "../permissions";
import { effectivePrices } from "./catalogue-load";
import type { LineIssue } from "./evaluate";
import type { LineExtracted } from "./recompute";
import type { ApprovedSnapshot } from "./service";
import type { LineView, OrderView, ProductBrief } from "./view-types";

export async function getOrderView(ctx: Ctx, orderId: string): Promise<OrderView> {
  assertCan(ctx.role, "order.view");
  const order = await prisma.order.findFirst({
    where: { id: orderId, workspaceId: ctx.workspaceId },
    include: {
      customer: true,
      sourceUpload: true,
      workspace: { select: { taxLabel: true, isDemo: true } },
      lines: { orderBy: { position: "asc" }, include: { product: { include: { conversions: true } } } },
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
      clarifications: { orderBy: { createdAt: "desc" }, take: 10 },
      auditEvents: { orderBy: { createdAt: "desc" }, take: 40 },
    },
  });
  if (!order) throw notFound("Order");

  const candidateIds = new Set<string>();
  for (const l of order.lines) for (const c of (l.candidates ?? []) as { productId: string }[]) candidateIds.add(c.productId);
  const candidateProducts = await prisma.product.findMany({
    where: { workspaceId: ctx.workspaceId, id: { in: [...candidateIds] } },
    include: { conversions: true },
  });
  const allIds = [...candidateIds, ...order.lines.map((l) => l.productId).filter((x): x is string => !!x)];
  const prices = await effectivePrices(prisma, ctx.workspaceId, order.customerId, allIds);
  type P = (typeof candidateProducts)[number];
  const brief = (p: P): ProductBrief => {
    const price = prices.get(p.id);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      category: p.category,
      specs: p.specs as Record<string, string>,
      sellingUnit: p.sellingUnit,
      conversions: p.conversions.map((c) => ({ unit: c.unit, factor: c.factor.toString() })),
      pricePaise: price?.paise ?? p.pricePaise,
      standardPricePaise: p.pricePaise,
      priceSource: price?.source ?? "STANDARD",
      archived: !!p.archivedAt,
    };
  };
  const productMap = new Map(candidateProducts.map((p) => [p.id, p]));

  const lines: LineView[] = order.lines.map((l) => {
    const ex = (l.extracted ?? {}) as LineExtracted;
    return {
      id: l.id,
      position: l.position,
      originalText: l.originalText,
      description: l.description,
      quantity: l.quantity?.toString() ?? null,
      unit: l.unit,
      rawUnit: l.rawUnit,
      sellQuantity: l.sellQuantity?.toString() ?? null,
      unitPricePaise: l.unitPricePaise,
      priceSource: l.priceSource,
      lineTotalPaise: l.lineTotalPaise,
      status: l.status,
      issues: (l.issues ?? []) as LineIssue[],
      product: l.product ? brief(l.product) : null,
      candidates: ((l.candidates ?? []) as { productId: string; reason: string }[])
        .map((c) => {
          const p = productMap.get(c.productId);
          return p ? { ...brief(p), reason: c.reason } : null;
        })
        .filter((x): x is ProductBrief & { reason: string } => !!x && !x.archived),
      method: ex.method ?? null,
      source: ex.source ?? null,
      manuallyEdited: l.manuallyEdited,
    };
  });

  const userIds = [order.createdById, order.approvedById, order.rejectedById, ...order.clarifications.map((c) => c.createdById)].filter(
    (x): x is string => !!x,
  );
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const nameOf = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? null : null);

  const counts = {
    confirmed: lines.filter((l) => l.status === "CONFIRMED").length,
    review: lines.filter((l) => l.status === "NEEDS_REVIEW").length,
    missing: lines.filter((l) => l.status === "MISSING_INFO").length,
    unmatched: lines.filter((l) => l.status === "UNMATCHED").length,
  };
  const blockers: string[] = [];
  const job = order.jobs[0];
  if (job && (job.status === "QUEUED" || job.status === "RUNNING")) blockers.push("Processing is still running");
  if (!order.customerId) blockers.push("Select a customer");
  if (!lines.length) blockers.push("Add at least one line item");
  const open = lines.length - counts.confirmed;
  if (open) blockers.push(`${open} line item${open === 1 ? "" : "s"} need${open === 1 ? "s" : ""} attention`);
  if (order.transcriptDirty) blockers.push("Transcript edited — reprocess or discard the edit");

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    version: order.version,
    inputType: order.inputType,
    inputLanguage: order.inputLanguage,
    detectedLanguage: order.detectedLanguage,
    sourceText: order.sourceText,
    transcript: order.transcript,
    transcriptDirty: order.transcriptDirty,
    source: order.sourceUpload
      ? {
          id: order.sourceUpload.id,
          kind: order.sourceUpload.kind,
          mimeType: order.sourceUpload.mimeType,
          originalName: order.sourceUpload.originalName,
          url: order.sourceUpload.storageKey && !order.sourceUpload.purgedAt ? `/api/files/${order.sourceUpload.id}` : null,
          purged: !!order.sourceUpload.purgedAt,
        }
      : null,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
          contactName: order.customer.contactName,
          phone: order.customer.phone,
          city: order.customer.city,
          preferredLanguage: order.customer.preferredLanguage,
        }
      : null,
    createdAt: order.createdAt.toISOString(),
    createdByName: nameOf(order.createdById),
    lines,
    subtotalPaise: order.subtotalPaise,
    taxPaise: order.taxPaise,
    taxRateBps: order.taxRateBps,
    taxLabel: order.workspace.taxLabel,
    totalPaise: order.totalPaise,
    approvedAt: order.approvedAt?.toISOString() ?? null,
    approvedByName: nameOf(order.approvedById),
    rejectedAt: order.rejectedAt?.toISOString() ?? null,
    rejectedByName: nameOf(order.rejectedById),
    rejectionReason: order.rejectionReason,
    snapshot: (order.approvedSnapshot as ApprovedSnapshot | null) ?? null,
    latestJob: job
      ? {
          id: job.id,
          kind: job.kind,
          status: job.status,
          stage: job.stage,
          errorCode: job.errorCode,
          errorMessage: job.errorMessage,
          retryable: job.retryable,
          provider: job.provider,
          attempts: job.attempts,
          createdAt: job.createdAt.toISOString(),
        }
      : null,
    clarifications: order.clarifications.map((c) => ({
      id: c.id,
      message: c.message,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      createdByName: nameOf(c.createdById),
    })),
    timeline: order.auditEvents.map((e) => ({
      id: e.id,
      type: e.type,
      actorName: e.actorName,
      createdAt: e.createdAt.toISOString(),
      data: e.data as Record<string, unknown>,
    })),
    blockers: order.status === "APPROVED" || order.status === "REJECTED" ? [] : blockers,
    counts,
    permissions: {
      canEdit: can(ctx.role, "order.edit") && order.status !== "APPROVED" && order.status !== "REJECTED",
      canApprove: can(ctx.role, "order.approve"),
    },
    isDemo: order.workspace.isDemo,
  };
}
