// Builds an editable clarification message from a draft's open issues.
// Pure and client-safe: the user always reviews and sends it themselves.
import type { OrderView } from "@/server/orders/view-types";
import { formatQty } from "./money";
import { unitLabel } from "./units";

export type ClarifyLang = "en" | "te";

const UNIT_TE: Record<string, string> = {
  PIECE: "పీసులు", BOX: "బాక్సులు", ROLL: "రోల్స్", COIL: "కాయిల్స్", METRE: "మీటర్లు", PACKET: "ప్యాకెట్లు", SET: "సెట్లు", KG: "కిలోలు", DOZEN: "డజన్లు",
};
const DIM_TE: Record<string, string> = {
  Brand: "బ్రాండ్", Rating: "రేటింగ్ (Amp)", "Wire size": "వైర్ సైజ్ (sq mm)", Colour: "రంగు", "Switch type": "రకం",
  Wattage: "వాట్స్", Poles: "పోల్స్", "Module size": "మాడ్యూల్", Size: "సైజ్", Length: "పొడవు", Cores: "కోర్స్",
};

export function defaultClarifyLang(order: Pick<OrderView, "customer" | "detectedLanguage">): ClarifyLang {
  const pref = order.customer?.preferredLanguage;
  if (pref === "TE") return "te";
  if (pref === "EN") return "en";
  return order.detectedLanguage === "te" || order.detectedLanguage === "mixed" ? "te" : "en";
}

function short(s: string) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

export function buildClarification(order: OrderView, lang: ClarifyLang, businessName: string): string {
  const questions: string[] = [];
  for (const line of order.lines) {
    if (line.status === "CONFIRMED") continue;
    const ref = `“${short(line.originalText === "Added by staff" ? line.product?.name ?? "Item" : line.originalText)}”`;
    const parts: string[] = [];
    for (const issue of line.issues) {
      const d = (issue.data ?? {}) as Record<string, unknown>;
      switch (issue.code) {
        case "AMBIGUOUS": {
          const opts = (d.options as string[] | undefined) ?? line.candidates.slice(0, 4).map((c) => c.name);
          const label = (d.label as string | undefined) ?? "Variant";
          parts.push(lang === "te" ? `${DIM_TE[label] ?? label} ఏది? (${opts.join(" / ")})` : `which ${label.toLowerCase()}? (${opts.join(" / ")})`);
          break;
        }
        case "SPEC_UNAVAILABLE":
          parts.push(
            lang === "te"
              ? `${d.requested} మా దగ్గర లేదు. ${(d.available as string[]).join(", ")} ఉన్నాయి — ఏది పంపమంటారు?`
              : `we don't stock ${d.requested}. We have ${(d.available as string[]).join(", ")} — which one should we send?`,
          );
          break;
        case "NO_MATCH":
        case "AI_SUGGESTED":
          parts.push(lang === "te" ? "ఏ వస్తువో స్పష్టంగా తెలియలేదు. బ్రాండ్, సైజ్ చెప్పగలరా?" : "we couldn't identify this item. Could you share the brand and size?");
          break;
        case "QUANTITY_MISSING":
          parts.push(lang === "te" ? "ఎన్ని కావాలి?" : "how many do you need?");
          break;
        case "UNIT_UNKNOWN":
          parts.push(lang === "te" ? `ఒక “${d.rawUnit}” అంటే ఎన్ని?` : `how many pieces/rolls is one “${d.rawUnit}”?`);
          break;
        case "UNIT_NOT_STATED": {
          const u = String(d.sellingUnit);
          const q = line.quantity ? formatQty(line.quantity) : "";
          parts.push(lang === "te" ? `${q} ${UNIT_TE[u] ?? unitLabel(u)} అనుకోవచ్చా?` : `is that ${q} ${unitLabel(u, Number(line.quantity ?? 2))}?`);
          break;
        }
        case "PARTIAL_PACK": {
          const u = String(d.sellingUnit);
          parts.push(
            lang === "te"
              ? `ఇది పూర్తి ${UNIT_TE[u] ?? unitLabel(u)} లెక్కనే వస్తుంది — ${d.lower || 1} లేదా ${d.upper}?`
              : `this comes in whole ${unitLabel(u)} only — ${d.lower || 1} or ${d.upper} ${unitLabel(u)}?`,
          );
          break;
        }
        case "UNIT_CONVERSION_UNAVAILABLE": {
          const u = String(d.sellingUnit);
          parts.push(
            lang === "te"
              ? `ఇది ${UNIT_TE[u] ?? unitLabel(u)} లెక్కన మాత్రమే అమ్ముతాం. ఎన్ని కావాలి?`
              : `we sell this per ${unitLabel(u, 1)} only. How many ${unitLabel(u)} do you need?`,
          );
          break;
        }
        default:
          break; // price changes and archived products are internal matters
      }
    }
    if (parts.length) questions.push(`${questions.length + 1}. ${ref} — ${parts.join(" ")}`);
  }

  const name = order.customer?.contactName ?? order.customer?.name;
  if (lang === "te") {
    return [
      `నమస్తే${name ? ` ${name} గారు` : ""},`,
      `మీ ఆర్డర్ #${order.number} గురించి కొన్ని వివరాలు కావాలి:`,
      "",
      ...(questions.length ? questions : ["(అన్ని వస్తువులు సరిపోయాయి)"]),
      "",
      `ధన్యవాదాలు,`,
      businessName,
    ].join("\n");
  }
  return [
    `Hello${name ? ` ${name}` : ""},`,
    `A few details are needed for your order #${order.number}:`,
    "",
    ...(questions.length ? questions : ["(All items are clear.)"]),
    "",
    "Thank you,",
    businessName,
  ].join("\n");
}

export function buildConfirmationText(order: OrderView, businessName: string, formatMoney: (p: number) => string) {
  const s = order.snapshot;
  if (!s) return "";
  const lines = s.lines.map((l, i) => `${i + 1}. ${l.name} — ${formatQty(l.sellQuantity)} ${unitLabel(l.sellingUnit, Number(l.sellQuantity))} × ${formatMoney(l.unitPricePaise)} = ${formatMoney(l.lineTotalPaise)}`);
  return [
    `Order confirmation #${s.number} — ${businessName}`,
    s.customer ? `For: ${s.customer.name}` : "",
    "",
    ...lines,
    "",
    s.taxPaise ? `Subtotal: ${formatMoney(s.subtotalPaise)}\n${s.taxLabel ?? "Tax"}: ${formatMoney(s.taxPaise)}` : "",
    `Total: ${formatMoney(s.totalPaise)}`,
    "",
    "This is an order confirmation, not a tax invoice.",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
    .trim();
}
