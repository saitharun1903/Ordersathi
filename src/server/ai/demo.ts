import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { sha256 } from "../storage";
import { FIXTURES, type Fixture } from "./fixtures";
import { ProviderError, type Extractor, type ImageReader, type Transcriber } from "./types";
import { parseOrderText } from "../orders/parse";

let hashes: Map<string, Fixture> | null = null;
function fixtureByHash(hash: string) {
  if (!hashes) {
    hashes = new Map();
    for (const f of FIXTURES) {
      try {
        const buf = readFileSync(path.join(process.cwd(), "public", "samples", f.file));
        hashes.set(sha256(buf), f);
      } catch {
        // sample file missing — fixture simply won't match
      }
    }
  }
  return hashes.get(hash);
}

export const demoTranscriber: Transcriber = {
  id: "demo-fixtures",
  live: false,
  async transcribe({ sha256: hash }) {
    const f = fixtureByHash(hash);
    if (!f || f.kind !== "AUDIO") {
      throw new ProviderError(
        "UNSUPPORTED_DEMO_INPUT",
        "Voice transcription needs a connected provider. In demo mode only the sample voice notes can be transcribed. You can type what the customer said into the transcript and process it.",
        false,
      );
    }
    return { text: f.transcript, language: f.language };
  },
};

export const demoImageReader: ImageReader = {
  id: "demo-fixtures",
  live: false,
  async readImage({ sha256: hash }) {
    const f = fixtureByHash(hash);
    if (!f || f.kind !== "IMAGE") {
      throw new ProviderError(
        "UNSUPPORTED_DEMO_INPUT",
        "Reading photos needs a connected provider. In demo mode only the sample list photo can be read. You can type the list into the transcript and process it.",
        false,
      );
    }
    return { text: f.transcript };
  },
};

/** Deterministic, non-AI extractor. Works for any text in every mode. */
export const rulesExtractor: Extractor = {
  id: "rules",
  live: false,
  async extract({ text }) {
    const lines = parseOrderText(text);
    return {
      detected_language: detectLanguage(text),
      lines: lines.map((l) => ({
        original_text: l.originalText,
        description: l.description,
        quantity: l.quantity,
        unit: l.rawUnit,
        brand: null,
        specs: [],
        candidate_skus: [],
      })),
    };
  },
};

export function detectLanguage(text: string): "en" | "te" | "mixed" | "other" {
  const telugu = (text.match(/[ఀ-౿]/g) ?? []).length;
  const latin = (text.match(/[a-z]/gi) ?? []).length;
  if (telugu && latin > 6) return "mixed";
  if (telugu) return "te";
  if (/\b(pampandi|kavali|rendu|padi|chuttalu|switchlu|dabbalu|okati|ivvandi)\b/i.test(text)) return "mixed";
  return latin ? "en" : "other";
}
