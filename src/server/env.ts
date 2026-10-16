import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  STORAGE_DIR: z.string().default("./storage"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ORDERSATHI_ANTHROPIC_BASE_URL: z.string().url().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TRANSCRIBE_MODEL: z.string().default("gpt-4o-transcribe"),
  EXTRACTION_PROVIDER: z.enum(["auto", "rules"]).default("auto"),
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  MAX_AUDIO_MB: z.coerce.number().positive().default(16),
  MAX_IMAGE_MB: z.coerce.number().positive().default(10),
  MAX_TEXT_CHARS: z.coerce.number().int().positive().default(8000),
  PROCESSING_LIMIT_PER_10_MIN: z.coerce.number().int().positive().default(40),
  SHOW_DEMO_LOGIN: z.enum(["true", "false"]).default("true"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse({
      ...process.env,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    });
    if (!parsed.success) {
      throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
    }
    cached = parsed.data;
  }
  return cached;
}
