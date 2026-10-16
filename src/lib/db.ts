import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Accept the variable names used by common Postgres integrations (Neon, Vercel Postgres, Supabase).
const datasourceUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || undefined;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"], ...(datasourceUrl ? { datasourceUrl } : {}) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
