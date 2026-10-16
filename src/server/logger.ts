// Structured logger. Only identifiers and timings — never message content,
// transcripts, file bytes, prices or secrets.
type Fields = Record<string, string | number | boolean | null | undefined>;

function emit(level: "info" | "warn" | "error", event: string, fields: Fields = {}) {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const log = {
  info: (e: string, f?: Fields) => emit("info", e, f),
  warn: (e: string, f?: Fields) => emit("warn", e, f),
  error: (e: string, f?: Fields) => emit("error", e, f),
};
