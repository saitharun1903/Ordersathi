import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Accept the variable names used by common Postgres integrations (Neon, Vercel Postgres, Supabase).
function resolveUrl() {
  const env = process.env;
  for (const n of ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]) if (env[n]) return env[n];
  for (const n of ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]) {
    const key = Object.keys(env).find((k) => k.endsWith(`_${n}`) && env[k]);
    if (key) return env[key];
  }
  return undefined;
}
const datasourceUrl = resolveUrl();

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"], ...(datasourceUrl ? { datasourceUrl } : {}) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
