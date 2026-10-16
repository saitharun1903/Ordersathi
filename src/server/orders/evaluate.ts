// Pure line evaluation: unit conversion, pricing and issue detection.
// No I/O so it can be unit-tested and reused by every mutation path.

import Decimal from "decimal.js";
import { DISCRETE_UNITS, unitLabel } from "@/lib/units";
import { formatPaise, formatQty } from "@/lib/money";
import { describeNote, type MatchNote } from "./match";

export type IssueCode =
  | "AMBIGUOUS"
  | "SPEC_UNAVAILABLE"
  | "NO_MATCH"
  | "AI_SUGGESTED"
  | "QUANTITY_MISSING"
  | "QUANTITY_INVALID"
  | "UNIT_UNKNOWN"
  | "UNIT_NOT_STATED"
  | "UNIT_CONVERSION_UNAVAILABLE"
  | "PARTIAL_PACK"
  | "PRICE_CHANGED"
  | "PRODUCT_ARCHIVED";

export type LineIssue = {
  code: IssueCode;
  message: string;
  blocking: boolean;
  data?: Record<string, unknown>;
};

export type LineStatusValue = "CONFIRMED" | "NEEDS_REVIEW" | "MISSING_INFO" | "UNMATCHED";

export type EvalProduct = {
  id: string;
  name: string;
  sellingUnit: string;
  archived: boolean;
  conversions: { unit: string; factor: string | number }[];
};

export type EvalInput = {
  product: EvalProduct | null;
  hasCandidates: boolean;
  note: MatchNote | null;
  quantity: string | number | null;
  unit: string | null;
  rawUnit: string | null;
  unitRecognized: boolean;
  unitPricePaise: number | null; // price recorded on the line
  effectivePricePaise: number | null; // current DB price for this customer
};

export type EvalResult = {
  status: LineStatusValue;
  issues: LineIssue[];
  sellQuantity: string | null;
  lineTotalPaise: number | null;
};

/** Universal count conversion — a dozen is always twelve pieces. */
const UNIVERSAL: Record<string, Record<string, number>> = { DOZEN: { PIECE: 12 } };

export function resolveSellQuantity(
  quantity: Decimal,
  unit: string | null,
  product: EvalProduct,
): { ok: true; sellQty: Decimal; factor: Decimal | null } | { ok: false; reason: "NOT_STATED" | "NO_CONVERSION" } {
  if (!unit) {
    if (product.sellingUnit === "PIECE") return { ok: true, sellQty: quantity, factor: null };
    return { ok: false, reason: "NOT_STATED" };
  }
  if (unit === product.sellingUnit) return { ok: true, sellQty: quantity, factor: null };
  const conv = product.conversions.find((c) => c.unit === unit);
  if (conv) {
    const factor = new Decimal(conv.factor);
    return { ok: true, sellQty: quantity.mul(factor), factor };
  }
  const universal = UNIVERSAL[unit]?.[product.sellingUnit];
  if (universal) return { ok: true, sellQty: quantity.mul(universal), factor: new Decimal(universal) };
  return { ok: false, reason: "NO_CONVERSION" };
}

export function lineTotal(sellQty: Decimal, unitPricePaise: number) {
  return sellQty.mul(unitPricePaise).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export function evaluateLine(input: EvalInput): EvalResult {
  const issues: LineIssue[] = [];
  const { product } = input;
  let sellQuantity: Decimal | null = null;
  let total: number | null = null;

  if (!product) {
    const msgs = describeNote(input.note);
    if (input.note?.kind === "unavailable") {
      issues.push({ code: "SPEC_UNAVAILABLE", message: msgs[0], blocking: true, data: { ...input.note } });
    } else if (input.note?.kind === "ambiguous") {
      for (const [i, m] of msgs.entries()) {
        issues.push({ code: "AMBIGUOUS", message: m, blocking: true, data: { ...input.note.dims[i] } });
      }
    } else if (input.note?.kind === "ai-suggested" && input.hasCandidates) {
      issues.push({ code: "AI_SUGGESTED", message: msgs[0], blocking: true });
    } else if (input.hasCandidates) {
      issues.push({ code: "AMBIGUOUS", message: "Several catalogue products match — choose one", blocking: true });
    } else {
      issues.push({ code: "NO_MATCH", message: "No catalogue product matches this wording", blocking: true });
    }
  } else if (product.archived) {
    issues.push({ code: "PRODUCT_ARCHIVED", message: `${product.name} is archived — choose an active product`, blocking: true });
  }

  const qty = input.quantity === null || input.quantity === "" ? null : new Decimal(input.quantity);
  if (qty === null) {
    issues.push({ code: "QUANTITY_MISSING", message: "Quantity not mentioned", blocking: true });
  } else if (qty.lte(0)) {
    issues.push({ code: "QUANTITY_INVALID", message: "Quantity must be more than zero", blocking: true });
  }

  if (!input.unit && input.rawUnit && !input.unitRecognized) {
    issues.push({
      code: "UNIT_UNKNOWN",
      message: `“${input.rawUnit}” is not a recognised unit — choose the unit`,
      blocking: true,
      data: { rawUnit: input.rawUnit },
    });
  } else if (product && qty && qty.gt(0)) {
    const r = resolveSellQuantity(qty, input.unit, product);
    if (!r.ok && r.reason === "NOT_STATED") {
      issues.push({
        code: "UNIT_NOT_STATED",
        message: `Unit not stated — ${product.name} is sold per ${unitLabel(product.sellingUnit, 1)}. Confirm ${formatQty(qty.toString())} ${unitLabel(product.sellingUnit, qty.toNumber())}?`,
        blocking: true,
        data: { sellingUnit: product.sellingUnit },
      });
    } else if (!r.ok) {
      issues.push({
        code: "UNIT_CONVERSION_UNAVAILABLE",
        message: `Ordered in ${unitLabel(input.unit)}, but this product is sold per ${unitLabel(product.sellingUnit, 1)} and has no ${unitLabel(input.unit, 1)} conversion`,
        blocking: true,
        data: { unit: input.unit, sellingUnit: product.sellingUnit },
      });
    } else {
      sellQuantity = r.sellQty;
      if (DISCRETE_UNITS.has(product.sellingUnit) && !r.sellQty.isInteger()) {
        const lower = r.sellQty.floor();
        const upper = r.sellQty.ceil();
        const per = r.factor ? new Decimal(1).div(r.factor) : null;
        issues.push({
          code: "PARTIAL_PACK",
          message:
            `${formatQty(qty.toString())} ${unitLabel(input.unit, qty.toNumber())} = ${formatQty(r.sellQty.toString())} ${unitLabel(product.sellingUnit)}` +
            (per && input.unit ? ` (1 ${unitLabel(product.sellingUnit, 1)} = ${formatQty(per.toString())} ${unitLabel(input.unit)})` : "") +
            `. Sold only in whole ${unitLabel(product.sellingUnit)}.`,
          blocking: true,
          data: { lower: lower.toNumber(), upper: upper.toNumber(), sellingUnit: product.sellingUnit },
        });
      }
    }
  }

  if (product && input.effectivePricePaise !== null) {
    if (input.unitPricePaise !== null && input.unitPricePaise !== input.effectivePricePaise) {
      issues.push({
        code: "PRICE_CHANGED",
        message: `Price changed from ${formatPaise(input.unitPricePaise)} to ${formatPaise(input.effectivePricePaise)} since this line was priced`,
        blocking: true,
        data: { from: input.unitPricePaise, to: input.effectivePricePaise },
      });
    }
    const price = input.unitPricePaise ?? input.effectivePricePaise;
    if (sellQuantity && !issues.some((i) => i.code === "PARTIAL_PACK")) total = lineTotal(sellQuantity, price);
  }

  let status: LineStatusValue = "CONFIRMED";
  if (!product && !input.hasCandidates) status = "UNMATCHED";
  else if (issues.some((i) => i.code === "QUANTITY_MISSING")) status = "MISSING_INFO";
  else if (issues.some((i) => i.blocking)) status = "NEEDS_REVIEW";

  return {
    status,
    issues,
    sellQuantity: sellQuantity ? sellQuantity.toString() : null,
    lineTotalPaise: total,
  };
}

export function computeTotals(lineTotals: (number | null)[], taxRateBps: number | null) {
  const subtotal = lineTotals.reduce<number>((a, b) => a + (b ?? 0), 0);
  const tax = taxRateBps ? new Decimal(subtotal).mul(taxRateBps).div(10000).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber() : 0;
  return { subtotal, tax, total: subtotal + tax };
}
