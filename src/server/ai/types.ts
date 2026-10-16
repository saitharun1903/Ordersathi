import { z } from "zod";

// Schema for AI extraction output. Note what is deliberately absent: prices,
// discounts, stock, tax, customer identity and product ids. Only catalogue SKU
// *suggestions* are allowed, and those are re-validated against the workspace.

export const ExtractedLineSchema = z.object({
  original_text: z.string().max(500).describe("The exact words from the message for this item"),
  description: z
    .string()
    .max(300)
    .describe("Product description in English without quantity or packaging unit, e.g. 'Anchor 6A one way switch'"),
  quantity: z.number().positive().max(1_000_000).nullable().describe("Number of units ordered, or null if not stated"),
  unit: z
    .string()
    .max(30)
    .nullable()
    .describe("Packaging unit as stated (piece, box, roll, coil, metre, packet, set, kg, dozen) or the original word; null if not stated"),
  brand: z.string().max(60).nullable().describe("Brand only if explicitly stated"),
  specs: z
    .array(z.object({ name: z.string().max(40), value: z.string().max(60) }))
    .max(10)
    .describe("Only specifications explicitly stated, e.g. rating 6A, size 2.5 sq mm, colour red"),
  candidate_skus: z
    .array(z.string().max(64))
    .max(5)
    .describe("SKUs from the provided catalogue that could match; empty if unsure"),
});

export const ExtractionSchema = z.object({
  detected_language: z.enum(["en", "te", "mixed", "other"]),
  lines: z.array(ExtractedLineSchema).max(100),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export type Lang = "AUTO" | "EN" | "TE";

export class ProviderError extends Error {
  constructor(
    public code:
      | "PROVIDER_NOT_CONFIGURED"
      | "UNSUPPORTED_DEMO_INPUT"
      | "TIMEOUT"
      | "RATE_LIMITED"
      | "MALFORMED_RESPONSE"
      | "PROVIDER_ERROR"
      | "REFUSED"
      | "EMPTY_RESULT",
    public safeMessage: string,
    public retryable: boolean,
  ) {
    super(safeMessage);
    this.name = "ProviderError";
  }
}

export interface Transcriber {
  readonly id: string;
  readonly live: boolean;
  transcribe(input: { bytes: Buffer; mimeType: string; sha256: string; language: Lang; signal: AbortSignal }): Promise<{ text: string; language?: string }>;
}

export interface ImageReader {
  readonly id: string;
  readonly live: boolean;
  readImage(input: { bytes: Buffer; mimeType: string; sha256: string; language: Lang; signal: AbortSignal }): Promise<{ text: string }>;
}

export interface Extractor {
  readonly id: string;
  readonly live: boolean;
  readonly model?: string;
  extract(input: { text: string; language: Lang; catalogue: { sku: string; name: string }[]; signal: AbortSignal }): Promise<Extraction>;
}
