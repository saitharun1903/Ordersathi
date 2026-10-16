import "server-only";
import { env } from "../env";
import { anthropicExtractor, anthropicImageReader } from "./anthropic";
import { demoImageReader, demoTranscriber, rulesExtractor } from "./demo";
import { openAITranscriber } from "./openai";
import type { Extractor, ImageReader, Transcriber } from "./types";

export type Providers = { transcriber: Transcriber; imageReader: ImageReader; extractor: Extractor };

let override: Partial<Providers> | null = null;
/** Test hook: substitute providers (e.g. a failing extractor). */
export function setProviderOverride(p: Partial<Providers> | null) {
  override = p;
}

export function getProviders(): Providers {
  const e = env();
  const anthropic = !!e.ANTHROPIC_API_KEY;
  const base: Providers = {
    transcriber: e.OPENAI_API_KEY ? openAITranscriber(e.OPENAI_TRANSCRIBE_MODEL) : demoTranscriber,
    imageReader: anthropic ? anthropicImageReader(e.ANTHROPIC_MODEL) : demoImageReader,
    extractor: anthropic && e.EXTRACTION_PROVIDER === "auto" ? anthropicExtractor(e.ANTHROPIC_MODEL) : rulesExtractor,
  };
  return { ...base, ...(override ?? {}) };
}

/** Safe status for display — never includes key material. */
export function providerStatus() {
  const e = env();
  return {
    extraction: e.ANTHROPIC_API_KEY && e.EXTRACTION_PROVIDER === "auto"
      ? { state: "live" as const, label: "Claude (Anthropic)", detail: e.ANTHROPIC_MODEL }
      : { state: "rules" as const, label: "Rule-based parser", detail: "Deterministic parsing, no AI" },
    image: e.ANTHROPIC_API_KEY
      ? { state: "live" as const, label: "Claude vision (Anthropic)", detail: e.ANTHROPIC_MODEL }
      : { state: "demo" as const, label: "Demo fixtures only", detail: "Set ANTHROPIC_API_KEY to read any photo" },
    audio: e.OPENAI_API_KEY
      ? { state: "live" as const, label: "OpenAI transcription", detail: e.OPENAI_TRANSCRIBE_MODEL }
      : { state: "demo" as const, label: "Demo fixtures only", detail: "Set OPENAI_API_KEY to transcribe any voice note" },
    whatsapp: { state: "not_configured" as const, label: "Not connected", detail: "Paste messages or upload files. WhatsApp Business API is not configured." },
  };
}
