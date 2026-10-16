// Deterministic order-text parser. Splits a message into candidate lines and
// separates quantity/unit from product description. It never guesses product
// variants — that is the matcher's job, and ambiguity is surfaced for review.

import { canonicalToken, normalizeText, stripInvisible } from "@/lib/normalize";
import { lookupUnitWord, type RequestUnit } from "@/lib/units";

export type ParsedLine = {
  originalText: string;
  description: string; // normalized description without quantity/unit/filler
  quantity: number | null;
  unit: RequestUnit | null;
  rawUnit: string | null;
  unitRecognized: boolean;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, hundred: 100,
  a: 1, an: 1, single: 1, couple: 2, half: 0.5,
  // transliterated Telugu
  okati: 1, oka: 1, rendu: 2, moodu: 3, mudu: 3, nalugu: 4, naalugu: 4, aidu: 5, ayidu: 5, aaru: 6, aru: 6,
  edu: 7, yedu: 7, enimidi: 8, tommidi: 9, padi: 10, padakondu: 11, pannendu: 12, padihenu: 15, iravai: 20,
  muppai: 30, nalabhai: 40, yabhai: 50, vanda: 100, vandha: 100,
  // Telugu script
  "ఒకటి": 1, "ఒక": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "ఐదు": 5, "అయిదు": 5, "ఆరు": 6, "ఏడు": 7,
  "ఎనిమిది": 8, "తొమ్మిది": 9, "పది": 10, "పదకొండు": 11, "పన్నెండు": 12, "పదిహేను": 15, "ఇరవై": 20,
  "ముప్పై": 30, "నలభై": 40, "యాభై": 50, "వంద": 100,
};
const WIRE_SIZES = new Set([0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25]);
const TENS = new Set([20, 30, 40, 50, 60]);

const FILLER = new Set([
  "send", "please", "pls", "plz", "kindly", "need", "needed", "want", "required", "require", "give", "us", "me",
  "of", "the", "and", "also", "urgent", "urgently", "today", "tomorrow", "sir", "anna", "garu", "bhai", "ji",
  "qty", "quantity", "x", "-", "–", "*", "with", "for", "ok", "okay", "thanks", "thank", "you", "some", "more",
  "pampandi", "pampu", "pampinchandi", "kavali", "kaavali", "ivvandi", "inka", "kuda", "kooda", "konchem",
  "పంపండి", "పంపు", "కావాలి", "ఇవ్వండి", "ఇంకా", "కూడా", "దయచేసి", "అండి", "గారు", "మరియు",
]);

const CHATTER = /^(hi|hello|hey|namaste|namaskaram|namaskar|good\s+(morning|evening|afternoon)|this is|i am|from|regards|thanks|thank you|నమస్తే|నమస్కారం)\b/i;

/** Split a message into raw segments that may each be one order line. */
export function splitSegments(text: string): string[] {
  const cleaned = stripInvisible(text)
    .replace(/\r/g, "")
    .replace(/\bsq\.\s*/gi, "sq ")
    .replace(/\b(nos|no|pcs|mtrs|mtr|pkts|pkt|qty)\.(?=\s)/gi, "$1")
    .replace(/[•·▪●◦]/g, "\n")
    .replace(/^\s*(\d+)[.)]\s+/gm, "\n"); // numbered list markers "1. " / "2) "
  return cleaned
    .split(/\n|;|,(?!\d)|\.(?=\s|$)|\s+(?:and|aur|inka|mariyu|మరియు|ఇంకా)\s+|\s+&\s+|\s\+\s/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function numberValue(tok: string): number | null {
  if (/^\d+(\.\d+)?$/.test(tok)) return Number(tok);
  if (tok in NUMBER_WORDS) return NUMBER_WORDS[tok];
  return null;
}

export function parseSegment(segment: string): ParsedLine | null {
  const originalText = segment.trim();
  if (!originalText) return null;
  if (CHATTER.test(originalText) && !/\d/.test(originalText)) return null;

  let s = normalizeText(originalText);
  // Glued quantity+unit: "10pcs", "5nos", "x10", "10x", "3mtrs" (but keep "90m" as a length spec).
  s = s
    .replace(/\b(\d+)(pcs|pc|nos|no|boxes|box|rolls|roll|mtrs|mtr|pkts|pkt|kgs|kg|coils|coil|dozen|doz)\b/g, "$1 $2")
    .replace(/\bx(\d+)\b/g, "x $1")
    .replace(/\b(\d+)x\b/g, "$1 x");
  const toks = s.split(" ").filter(Boolean);

  type Cand = { idx: number; value: number; span: number; unitIdx: number | null; score: number };
  const cands: Cand[] = [];
  for (let i = 0; i < toks.length; i++) {
    let value = numberValue(toks[i]);
    if (value === null) continue;
    // "a"/"an" only count as quantities when followed by a unit word ("a box of ...")
    if ((toks[i] === "a" || toks[i] === "an") && !lookupUnitWord(toks[i + 1] ?? "").known) continue;
    let span = 1;
    const next = numberValue(toks[i + 1] ?? "");
    if (TENS.has(value) && next !== null && next < 10 && Number.isInteger(next)) {
      value += next;
      span = 2;
    }
    const after = toks[i + span];
    const unitHit = after !== undefined && lookupUnitWord(after).known;
    let score = 0;
    if (unitHit) score += 10;
    if (i === 0) score += 4;
    if (i + span === toks.length) score += 3;
    if (toks[i - 1] === "x" || toks[i - 1] === "qty" || toks[i - 1] === "-") score += 5;
    if (toks[i + span] === "x") score += 3;
    const isDecimal = !Number.isInteger(value);
    // A bare decimal next to wire/cable is a size, not a quantity ("2.5 wire").
    if (isDecimal && !unitHit) score -= 20;
    cands.push({ idx: i, value, span, unitIdx: unitHit ? i + span : null, score });
  }

  const remove = new Set<number>();
  let quantity: number | null = null;
  let unit: RequestUnit | null = null;
  let rawUnit: string | null = null;
  let unitRecognized = true;

  const best = cands.filter((c) => c.score > -10).sort((a, b) => b.score - a.score)[0];
  if (best) {
    quantity = best.value;
    for (let k = 0; k < best.span; k++) remove.add(best.idx + k);
    if (best.unitIdx !== null) {
      const word = toks[best.unitIdx];
      const hit = lookupUnitWord(word);
      rawUnit = word;
      remove.add(best.unitIdx);
      if (hit.known && hit.unit) unit = hit.unit;
      else unitRecognized = false;
    }
  }

  // Remaining bare numbers are specifications. Before wire/cable they mean sq mm.
  const isWireLine = toks.some((t) => t === "wire" || t === "cable");
  const descToks: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    if (remove.has(i)) continue;
    const t = toks[i];
    if (FILLER.has(t)) continue;
    // Leftover bare numbers in a wire/cable line are conductor sizes ("1.5 red wire").
    if (/^\d+(\.\d+)?$/.test(t) && isWireLine && WIRE_SIZES.has(Number(t))) {
      descToks.push(`${Number(t)}sqmm`);
      continue;
    }
    descToks.push(canonicalToken(t));
  }

  const description = descToks.join(" ").trim();
  if (!description && quantity === null) return null;
  return { originalText, description, quantity, unit, rawUnit, unitRecognized };
}

export function parseOrderText(text: string): ParsedLine[] {
  return splitSegments(text)
    .map(parseSegment)
    .filter((l): l is ParsedLine => l !== null);
}
