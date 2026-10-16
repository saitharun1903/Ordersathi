import { describe, expect, it } from "vitest";
import { computeTotals, evaluateLine, type EvalInput } from "@/server/orders/evaluate";
import { formatPaise, parseRupeesToPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

const tape = { id: "t", name: "Tape (pack of 10)", sellingUnit: "PACKET", archived: false, conversions: [{ unit: "PIECE", factor: "0.1" }] };
const wire = { id: "w", name: "Wire 90 m", sellingUnit: "ROLL", archived: false, conversions: [] };
const sw = { id: "s", name: "Switch", sellingUnit: "PIECE", archived: false, conversions: [{ unit: "BOX", factor: "20" }] };
const base: EvalInput = { product: sw, hasCandidates: true, note: null, quantity: "10", unit: null, rawUnit: null, unitRecognized: true, unitPricePaise: 4200, effectivePricePaise: 4200 };

describe("line evaluation", () => {
  it("confirms a fully specified line and prices it", () => {
    const r = evaluateLine(base);
    expect(r.status).toBe("CONFIRMED");
    expect(r.lineTotalPaise).toBe(42000);
  });

  it("converts boxes only with an explicit product conversion", () => {
    const r = evaluateLine({ ...base, quantity: "2", unit: "BOX" });
    expect(r.sellQuantity).toBe("40");
    expect(r.lineTotalPaise).toBe(168000);
    const w = evaluateLine({ ...base, product: wire, quantity: "50", unit: "METRE" });
    expect(w.issues.map((i) => i.code)).toContain("UNIT_CONVERSION_UNAVAILABLE");
    expect(w.lineTotalPaise).toBeNull();
  });

  it("flags partial packs instead of rounding", () => {
    const r = evaluateLine({ ...base, product: tape, quantity: "15", unit: "PIECE", unitPricePaise: 12000, effectivePricePaise: 12000 });
    expect(r.status).toBe("NEEDS_REVIEW");
    const pp = r.issues.find((i) => i.code === "PARTIAL_PACK")!;
    expect(pp.message).toContain("1.5 packets");
    expect(pp.data).toMatchObject({ lower: 1, upper: 2 });
  });

  it("requires a unit for non-piece products", () => {
    const r = evaluateLine({ ...base, product: wire, quantity: "2", unit: null });
    expect(r.issues.map((i) => i.code)).toEqual(["UNIT_NOT_STATED"]);
  });

  it("flags missing quantity and unknown units", () => {
    expect(evaluateLine({ ...base, quantity: null }).status).toBe("MISSING_INFO");
    const u = evaluateLine({ ...base, rawUnit: "katta", unitRecognized: false });
    expect(u.issues[0].code).toBe("UNIT_UNKNOWN");
  });

  it("flags a price change until it is accepted", () => {
    const r = evaluateLine({ ...base, unitPricePaise: 4000, effectivePricePaise: 4200 });
    expect(r.issues[0]).toMatchObject({ code: "PRICE_CHANGED", blocking: true });
    expect(r.issues[0].message).toBe("Price changed from ₹40.00 to ₹42.00 since this line was priced");
  });

  it("marks lines without a product as unmatched or needing a choice", () => {
    expect(evaluateLine({ ...base, product: null, hasCandidates: false }).status).toBe("UNMATCHED");
    expect(evaluateLine({ ...base, product: null, hasCandidates: true }).status).toBe("NEEDS_REVIEW");
  });

  it("rounds money half-up in paise and applies only configured tax", () => {
    const r = evaluateLine({ ...base, product: { ...wire, sellingUnit: "METRE" }, quantity: "2.5", unit: "METRE", unitPricePaise: 6399, effectivePricePaise: 6399 });
    expect(r.lineTotalPaise).toBe(15998); // 159.975 → 159.98
    expect(computeTotals([10000, 2500, null], null)).toEqual({ subtotal: 12500, tax: 0, total: 12500 });
    expect(computeTotals([10000], 1800)).toEqual({ subtotal: 10000, tax: 1800, total: 11800 });
  });
});

describe("formatting", () => {
  it("uses Indian digit grouping and rupee symbol", () => {
    expect(formatPaise(1234567800)).toBe("₹1,23,45,678.00");
    expect(parseRupeesToPaise("1,250.5")).toBe(125050);
    expect(parseRupeesToPaise("abc")).toBeNull();
  });
  it("renders times in Asia/Kolkata", () => {
    expect(formatDateTime("2026-10-16T00:00:00Z")).toBe("16 Oct, 5:30 AM");
  });
});

describe("conversion precision", () => {
  it("rounds converted quantities to the stored precision before pricing", () => {
    const p = { id: "c", name: "Cable", sellingUnit: "METRE", archived: false, conversions: [{ unit: "PIECE", factor: "0.3048" }] };
    const r = evaluateLine({ product: p, hasCandidates: true, note: null, quantity: "7", unit: "PIECE", rawUnit: null, unitRecognized: true, unitPricePaise: 10000, effectivePricePaise: 10000 });
    expect(r.sellQuantity).toBe("2.134");
    expect(r.lineTotalPaise).toBe(21340);
  });
});
