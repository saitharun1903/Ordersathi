import "server-only";
import { ZodError } from "zod";
import { requireContext, type Ctx } from "../context";
import { AppError, type ActionResult } from "../errors";
import { log } from "../logger";

/** Wrap a server action: resolve the authorised context, map errors to safe results. */
export async function run<T>(name: string, fn: (ctx: Ctx) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const ctx = await requireContext();
    return { ok: true, data: await fn(ctx) };
  } catch (err) {
    return toResult(name, err);
  }
}

export function toResult(name: string, err: unknown): { ok: false; code: AppError["code"] | "INTERNAL"; message: string; fieldErrors?: Record<string, string> } {
  if (err instanceof AppError) return { ok: false, code: err.code, message: err.message, fieldErrors: err.fieldErrors };
  if (err instanceof ZodError) {
    const fe: Record<string, string> = {};
    for (const i of err.issues) fe[i.path.join(".")] ??= i.message;
    return { ok: false, code: "VALIDATION", message: err.issues[0]?.message ?? "Invalid input", fieldErrors: fe };
  }
  // Next.js redirect/notFound errors must propagate.
  if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
  log.error("action.failed", { action: name, name: err instanceof Error ? err.name : "unknown" });
  if (process.env.NODE_ENV !== "production") console.error(err);
  return { ok: false, code: "INTERNAL", message: "Something went wrong. Your changes were not saved — please try again." };
}
