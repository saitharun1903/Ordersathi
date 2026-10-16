import "server-only";
import OpenAI, { toFile } from "openai";
import { ProviderError, type Transcriber } from "./types";

// Speech-to-text via OpenAI's transcription endpoint (supports Telugu and English).
export function openAITranscriber(model: string): Transcriber {
  return {
    id: "openai-transcribe",
    live: true,
    async transcribe({ bytes, mimeType, language, signal }) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1 });
        const ext = mimeType.split("/")[1]?.replace("mpeg", "mp3").replace("x-", "") ?? "webm";
        const result = await client.audio.transcriptions.create(
          {
            file: await toFile(bytes, `voice.${ext}`, { type: mimeType }),
            model,
            ...(language === "TE" ? { language: "te" } : language === "EN" ? { language: "en" } : {}),
            prompt: "Order for an electrical shop: switches, sockets, wires, MCB, Anchor, Havells, Polycab, sq mm, amp.",
          },
          { signal },
        );
        const text = (result as { text?: string }).text?.trim() ?? "";
        if (!text) throw new ProviderError("EMPTY_RESULT", "No speech was detected in the recording.", false);
        return { text };
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        if (err instanceof OpenAI.RateLimitError) throw new ProviderError("RATE_LIMITED", "The transcription provider is busy. Try again shortly.", true);
        if (err instanceof OpenAI.AuthenticationError) throw new ProviderError("PROVIDER_NOT_CONFIGURED", "The transcription provider rejected the configured credentials.", false);
        if (err instanceof Error && err.name === "AbortError") throw new ProviderError("TIMEOUT", "Transcription took too long.", true);
        throw new ProviderError("PROVIDER_ERROR", "Transcription failed.", true);
      }
    },
  };
}
