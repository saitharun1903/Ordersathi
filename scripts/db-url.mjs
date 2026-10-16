// Resolves database URLs from whichever Postgres integration is connected
// (Neon, Vercel Postgres, Supabase, Prisma Postgres, or a plain DATABASE_URL).
export function resolveDatabaseUrls(env = process.env) {
  const pooled = env.DATABASE_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL || env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING;
  const direct = env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DIRECT_URL || pooled;
  return { pooled, direct };
}
