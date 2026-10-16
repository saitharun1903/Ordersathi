// Unit vocabulary. Units are only ever converted via explicit, product-specific
// UnitConversion rows — never by assumption.

export const SELLING_UNITS = ["PIECE", "BOX", "ROLL", "COIL", "METRE", "PACKET", "SET", "KG"] as const;
export type SellingUnit = (typeof SELLING_UNITS)[number];
export const REQUEST_UNITS = [...SELLING_UNITS, "DOZEN"] as const;
export type RequestUnit = (typeof REQUEST_UNITS)[number];

/** Units that cannot be sold in fractions. */
export const DISCRETE_UNITS = new Set<string>(["PIECE", "BOX", "ROLL", "COIL", "PACKET", "SET", "DOZEN"]);

const LABELS: Record<string, [string, string]> = {
  PIECE: ["piece", "pieces"],
  BOX: ["box", "boxes"],
  ROLL: ["roll", "rolls"],
  COIL: ["coil", "coils"],
  METRE: ["metre", "metres"],
  PACKET: ["packet", "packets"],
  SET: ["set", "sets"],
  KG: ["kg", "kg"],
  DOZEN: ["dozen", "dozen"],
};

export function unitLabel(unit: string | null | undefined, qty: number = 2) {
  if (!unit) return "";
  const l = LABELS[unit];
  if (!l) return unit.toLowerCase();
  return qty === 1 ? l[0] : l[1];
}

export const UNIT_SHORT: Record<string, string> = {
  PIECE: "pc",
  BOX: "box",
  ROLL: "roll",
  COIL: "coil",
  METRE: "m",
  PACKET: "pkt",
  SET: "set",
  KG: "kg",
  DOZEN: "doz",
};

/**
 * Unit words in English, Telugu script and transliterated Telugu.
 * Keys are normalized (lowercase, no ZWNJ). Unknown packaging words map to null
 * so they can be flagged instead of guessed.
 */
const UNIT_WORDS: Record<string, RequestUnit | null> = {
  // English
  pc: "PIECE", pcs: "PIECE", piece: "PIECE", pieces: "PIECE", no: "PIECE", nos: "PIECE", number: "PIECE", numbers: "PIECE", unit: "PIECE", units: "PIECE",
  box: "BOX", boxes: "BOX", bx: "BOX", carton: "BOX", cartons: "BOX",
  roll: "ROLL", rolls: "ROLL", bundle: "ROLL", bundles: "ROLL",
  coil: "COIL", coils: "COIL",
  m: "METRE", mtr: "METRE", mtrs: "METRE", metre: "METRE", metres: "METRE", meter: "METRE", meters: "METRE",
  packet: "PACKET", packets: "PACKET", pkt: "PACKET", pkts: "PACKET", pack: "PACKET", packs: "PACKET",
  set: "SET", sets: "SET",
  kg: "KG", kgs: "KG", kilo: "KG", kilos: "KG",
  dozen: "DOZEN", dozens: "DOZEN", doz: "DOZEN",
  // Transliterated Telugu
  dabba: "BOX", dabbalu: "BOX", pette: "BOX", pettelu: "BOX", boxlu: "BOX",
  chutta: "ROLL", chuttalu: "ROLL", rollu: "ROLL", rolllu: "ROLL", rollulu: "ROLL",
  peesulu: "PIECE", pieceslu: "PIECE", mukkalu: "PIECE",
  meterlu: "METRE", meetarlu: "METRE", metrulu: "METRE",
  packetlu: "PACKET", paketlu: "PACKET",
  // Telugu script
  "బాక్స్": "BOX", "బాక్సులు": "BOX", "బాక్సు": "BOX", "డబ్బా": "BOX", "డబ్బాలు": "BOX", "పెట్టె": "BOX", "పెట్టెలు": "BOX",
  "రోల్": "ROLL", "రోల్స్": "ROLL", "రోల్లు": "ROLL", "చుట్ట": "ROLL", "చుట్టలు": "ROLL",
  "కాయిల్": "COIL",
  "మీటర్": "METRE", "మీటర్లు": "METRE", "మీటరు": "METRE",
  "పీస్": "PIECE", "పీసులు": "PIECE", "ముక్కలు": "PIECE",
  "ప్యాకెట్": "PACKET", "ప్యాకెట్లు": "PACKET",
  "కిలో": "KG", "కిలోలు": "KG",
  "డజను": "DOZEN", "డజన్": "DOZEN",
  // Recognised packaging words with no fixed meaning — flagged for review
  katta: null, kattalu: null, "కట్ట": null, "కట్టలు": null, lot: null,
};

export function lookupUnitWord(word: string): { known: true; unit: RequestUnit | null } | { known: false } {
  const w = word.toLowerCase().replace(/[‌‍.]/g, "");
  if (w in UNIT_WORDS) return { known: true, unit: UNIT_WORDS[w] };
  return { known: false };
}

export function isUnitWord(word: string) {
  return lookupUnitWord(word).known;
}
