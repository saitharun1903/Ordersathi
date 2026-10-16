import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { computeTotals, evaluateLine, type LineIssue, type LineStatusValue } from "./evaluate";
import { effectivePrices } from "./catalogue-load";
import { AppError } from "../errors";
import type { MatchNote } from "./match";

type Tx = Prisma.TransactionClient;

/** Order totals are stored as 32-bit integers of paise (max ≈ ₹2.1 crore). */
const MAX_ORDER_TOTAL_PAISE = 2_000_000_000;

export type LineExtracted = {
  note?: MatchNote | null;
  method?: string;
  unitRecognized?: boolean;
  brand?: string | null;
  specs?: Record<string, string>;
  source?: "rules" | "ai" | "manual";
};

export function deriveStatus(lines: { status: LineStatusValue }[], customerId: string | null): OrderStatus {
  if (!lines.length) return "DRAFT";
  if (lines.some((l) => l.status !== "CONFIRMED")) return "NEEDS_CLARIFICATION";
  if (!customerId) return "DRAFT";
  return "READY_FOR_REVIEW";
}

/**
 * Re-evaluates every line of an open order against current catalogue data and
 * recalculates totals on the server. Never touches approved/rejected orders.
 */
export async function recomputeOrder(tx: Tx, workspaceId: string, orderId: string, opts: { repriceAll?: boolean } = {}) {
  const order = await tx.order.findFirst({
    where: { id: orderId, workspaceId },
    include: {
      lines: { orderBy: { position: "asc" }, include: { product: { include: { conversions: true } } } },
      workspace: { select: { taxRateBps: true } },
    },
  });
  if (!order || order.status === "APPROVED" || order.status === "REJECTED") return order;

  const prices = await effectivePrices(
    tx,
    workspaceId,
    order.customerId,
    order.lines.map((l) => l.productId).filter((x): x is string => !!x),
  );

  const evaluated: { status: LineStatusValue; total: number | null }[] = [];
  for (const line of order.lines) {
    const ex = (line.extracted ?? {}) as LineExtracted;
    const price = line.productId ? prices.get(line.productId) ?? null : null;
    let unitPricePaise = line.unitPricePaise;
    let priceSource = line.priceSource;
    if (line.product && price && (unitPricePaise === null || opts.repriceAll)) {
      unitPricePaise = price.paise;
      priceSource = price.source;
    }
    if (!line.product) {
      unitPricePaise = null;
      priceSource = null;
    }
    const candidates = (line.candidates ?? []) as unknown[];
    const r = evaluateLine({
      product: line.product
        ? {
            id: line.product.id,
            name: line.product.name,
            sellingUnit: line.product.sellingUnit,
            archived: !!line.product.archivedAt,
            conversions: line.product.conversions.map((c) => ({ unit: c.unit, factor: c.factor.toString() })),
          }
        : null,
      hasCandidates: candidates.length > 0,
      note: ex.note ?? null,
      quantity: line.quantity ? line.quantity.toString() : null,
      unit: line.unit,
      rawUnit: line.rawUnit,
      unitRecognized: ex.unitRecognized ?? true,
      unitPricePaise,
      effectivePricePaise: price?.paise ?? null,
    });
    await tx.orderLine.update({
      where: { id: line.id },
      data: {
        status: r.status,
        issues: r.issues as unknown as Prisma.InputJsonValue,
        sellQuantity: r.sellQuantity,
        unitPricePaise,
        priceSource,
        lineTotalPaise: r.lineTotalPaise,
      },
    });
    evaluated.push({ status: r.status, total: r.lineTotalPaise });
  }

  const totals = computeTotals(evaluated.map((e) => e.total), order.workspace.taxRateBps);
  if (totals.total > MAX_ORDER_TOTAL_PAISE) {
    throw new AppError("VALIDATION", "This order’s total is over ₹2 crore. Split it into smaller orders.");
  }
  const status = deriveStatus(evaluated, order.customerId);
  return tx.order.update({
    where: { id: order.id },
    data: {
      subtotalPaise: totals.subtotal,
      taxPaise: totals.tax,
      totalPaise: totals.total,
      taxRateBps: order.workspace.taxRateBps,
      status,
    },
  });
}

export type { LineIssue };
