// Text normalization shared by aliases, parsing and matching.
// Maps Telugu script and transliterated words onto canonical English tokens.

const LEXICON: Record<string, string> = {
  // product nouns (Telugu script)
  "స్విచ్": "switch", "స్విచ్చ": "switch", "స్విచ్లు": "switch", "స్విచ్చులు": "switch",
  "సాకెట్": "socket", "సాకెట్లు": "socket", "సాకెట్స్": "socket",
  "వైరు": "wire", "వైర్": "wire", "వైర్లు": "wire", "తీగ": "wire",
  "బల్బు": "bulb", "బల్బ్": "bulb", "బల్బులు": "bulb",
  "ఫ్యాన్": "fan", "ఫ్యాన్లు": "fan", "పంకా": "fan",
  "పైపు": "pipe", "పైపులు": "pipe", "పైప్": "pipe",
  "టేప్": "tape", "టేపు": "tape", "టేపులు": "tape",
  "రెగ్యులేటర్": "regulator", "హోల్డర్": "holder", "హోల్డర్లు": "holder",
  "ప్లేట్": "plate", "ప్లేట్లు": "plate", "బోర్డు": "board", "బోర్డ్": "board",
  "ఎంసిబి": "mcb", "బ్రేకర్": "mcb",
  "ట్యూబ్లైట్": "batten", "ట్యూబ్": "batten", "బ్యాటెన్": "batten",
  "కేబుల్": "cable", "ప్లగ్": "plug", "బెల్": "bell", "క్లిప్": "clip", "క్లిప్పులు": "clip",
  // brands in Telugu script
  "ఆంకర్": "anchor", "యాంకర్": "anchor", "హావెల్స్": "havells", "హేవెల్స్": "havells", "పాలీక్యాబ్": "polycab", "పాలికాబ్": "polycab",
  "ఫినోలెక్స్": "finolex", "ఫిలిప్స్": "philips", "క్రాంప్టన్": "crompton", "లెగ్రాండ్": "legrand", "సిస్కా": "syska", "విప్రో": "wipro",
  // colours
  "ఎరుపు": "red", "ఎర్ర": "red", "నలుపు": "black", "నల్ల": "black", "తెలుపు": "white", "తెల్ల": "white",
  "పచ్చ": "green", "ఆకుపచ్చ": "green", "పసుపు": "yellow", "నీలం": "blue", "బ్రౌన్": "brown",
  // transliterated
  switchlu: "switch", switchulu: "switch", socketlu: "socket", socketulu: "socket",
  wirelu: "wire", wiru: "wire", bulbulu: "bulb", bulblu: "bulb", fanlu: "fan", pipulu: "pipe", pipelu: "pipe",
  tapelu: "tape", holderlu: "holder", platelu: "plate", mcblu: "mcb",
  erra: "red", errani: "red", nalla: "black", nallani: "black", tella: "white", tellani: "white", pacha: "green",
  // English plurals / synonyms
  switches: "switch", sockets: "socket", wires: "wire", bulbs: "bulb", fans: "fan", pipes: "pipe",
  tapes: "tape", holders: "holder", plates: "plate", mcbs: "mcb", regulators: "regulator", boards: "board",
  cables: "cable", plugs: "plug", ties: "tie", clips: "clip", lights: "light", battens: "batten", lamps: "bulb", lamp: "bulb",
  colour: "color", grey: "gray",
};

/** Telugu & transliterated words for amp/sq mm etc. joined to the number. */
const SPEC_UNIT_PATTERNS: [RegExp, string][] = [
  [/(\d+(?:\.\d+)?)\s*(?:sq\.?\s*mm|sqmm|sq\s*\.?\s*m\.?m\.?|mm2|mm²|square\s*mm|sq)\b/gi, "$1sqmm"],
  [/(\d+(?:\.\d+)?)\s*(?:amps?|amperes?|ampere|ఆంప్స్|ఆంపియర్)(?![a-z])/gi, "$1a"],
  [/(\d+(?:\.\d+)?)\s*a\b/gi, "$1a"],
  [/(\d+(?:\.\d+)?)\s*(?:watts?|వాట్స్|వాట్)(?![a-z])/gi, "$1w"],
  [/(\d+(?:\.\d+)?)\s*w\b/gi, "$1w"],
  [/(\d+)\s*(?:-|\s)?\s*(?:way)\b/gi, "$1way"],
  [/\b(one|single)\s*-?\s*way\b/gi, "1way"],
  [/\b(two)\s*-?\s*way\b/gi, "2way"],
  [/(\d+)\s*(?:-|\s)?\s*(?:modules?|mod)\b/gi, "$1module"],
  [/(\d+)\s*(?:-|\s)?\s*(?:cores?|c)\b/gi, "$1core"],
  [/(\d+)\s*(?:-|\s)?\s*(?:pin)\b/gi, "$1pin"],
  [/(\d+(?:\.\d+)?)\s*(?:mm)\b/gi, "$1mm"],
  [/(\d+)\s*(?:ft|feet|foot)\b/gi, "$1ft"],
  [/(\d+)\s*(?:swg)\b/gi, "$1swg"],
];

const SPOKEN_DIGITS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  ten: "10", twelve: "12", sixteen: "16", twenty: "20", thirty: "30", "thirty-two": "32",
};
const SPOKEN = Object.keys(SPOKEN_DIGITS).join("|");

/** "two point five square mm" → "2.5 square mm", "six amp" → "6 amp" (speech transcripts). */
function spokenSpecNumbers(s: string) {
  s = s.replace(new RegExp(`\\b(${SPOKEN})\\s+point\\s+(${SPOKEN})\\b`, "gi"), (_, a, b) => `${SPOKEN_DIGITS[a.toLowerCase()]}.${SPOKEN_DIGITS[b.toLowerCase()]}`);
  s = s.replace(
    new RegExp(`\\b(${SPOKEN})(?:\\s+|-)(amps?|ampere|watts?|square|sq|mm|modules?|core|pin)\\b`, "gi"),
    (_, a, u) => `${SPOKEN_DIGITS[a.toLowerCase()]} ${u}`,
  );
  return s;
}

export function stripInvisible(s: string) {
  return s.replace(/[​-‏⁠﻿]/g, "");
}

/** Lowercase, compact spec tokens, map Telugu/translit words to canonical tokens. */
export function normalizeText(input: string): string {
  let s = spokenSpecNumbers(stripInvisible(input).toLowerCase());
  s = s.replace(/[“”"'`’]/g, " ").replace(/[(),;:!?/\\[\]{}|]/g, " ");
  for (const [re, rep] of SPEC_UNIT_PATTERNS) s = s.replace(re, rep);
  s = s.replace(/\b(\d+)\.0+(?=[a-z])/g, "$1");
  s = s.replace(/(?<=[a-zఀ-౿])-(?=[a-zఀ-౿])/g, " ");
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map(canonicalToken)
    .join(" ")
    .trim();
}

export function canonicalToken(tok: string): string {
  const t = tok.replace(/^[.\-]+|[.\-]+$/g, "");
  if (LEXICON[t]) return LEXICON[t];
  // Telugu plural suffix "లు" / transliterated "lu"
  if (/[ఀ-౿]/.test(t)) {
    const base = t.replace(/(లు|ను|ని)$/u, "");
    if (LEXICON[base]) return LEXICON[base];
    const base2 = base.replace(/్$/u, "");
    if (LEXICON[base2]) return LEXICON[base2];
  }
  return t;
}

export function tokens(input: string): string[] {
  return normalizeText(input).split(" ").filter(Boolean);
}

/** Normalize a spec value for comparison: "2.5 sq mm" → "2.5sqmm", "6 A" → "6a". */
export function normalizeSpecValue(v: string): string {
  return normalizeText(v).replace(/\s+/g, "");
}
