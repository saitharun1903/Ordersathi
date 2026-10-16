// Money is always integer paise. Formatting uses Indian digit grouping (1,23,456.00).

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPaise(paise: number | null | undefined, opts?: { compact?: boolean }) {
  if (paise === null || paise === undefined) return "—";
  if (opts?.compact && paise % 100 === 0) return inrCompact.format(paise / 100);
  return inr.format(paise / 100);
}

/** Lakh/crore short form for KPI tiles: ₹4.2 L, ₹1.1 Cr. */
export function formatPaiseShort(paise: number) {
  const rupees = paise / 100;
  if (rupees >= 1_00_00_000) return `₹${trim(rupees / 1_00_00_000)} Cr`;
  if (rupees >= 1_00_000) return `₹${trim(rupees / 1_00_000)} L`;
  return inrCompact.format(Math.round(rupees));
}

function trim(n: number) {
  return n.toFixed(n >= 100 ? 0 : 1).replace(/\.0$/, "");
}

/** Parse a rupee string ("1,250.50", "₹ 40") to integer paise. Returns null if invalid. */
export function parseRupeesToPaise(input: string | number): number | null {
  const s = String(input).replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const paise = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return Number.isSafeInteger(paise) ? paise : null;
}

export function paiseToRupeeInput(paise: number) {
  return (paise / 100).toFixed(2).replace(/\.00$/, "");
}

const qtyFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });
export function formatQty(q: number | string | null | undefined) {
  if (q === null || q === undefined || q === "") return "—";
  return qtyFmt.format(Number(q));
}
