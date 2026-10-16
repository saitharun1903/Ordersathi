// Resolves database URLs from whichever Postgres integration is connected
// (Neon, Vercel Postgres, Supabase, Prisma Postgres, or a plain DATABASE_URL).
// Vercel's Storage integrations may add a custom prefix (e.g. STORAGE_DATABASE_URL), so suffixes are matched too.
const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DIRECT_URL"];

function find(env, names) {
  for (const n of names) if (env[n]) return { name: n, value: env[n] };
  for (const n of names) {
    const key = Object.keys(env).find((k) => k.endsWith(`_${n}`) && env[k]);
    if (key) return { name: key, value: env[key] };
  }
  return null;
}

export function resolveDatabaseUrls(env = process.env) {
  const pooled = find(env, POOLED) ?? find(env, DIRECT);
  const direct = find(env, DIRECT) ?? pooled;
  return { pooled: pooled?.value, direct: direct?.value, pooledName: pooled?.name, directName: direct?.name };
}

/** Names (never values) of variables that look database-related — for build diagnostics. */
export function databaseVarNames(env = process.env) {
  return Object.keys(env).filter((k) => /DATABASE|POSTGRES|^PG/.test(k)).sort();
}
