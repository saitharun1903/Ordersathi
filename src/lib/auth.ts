import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";

// On Vercel, fall back to the deployment URL so preview deployments work without extra config.
const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
const baseURL = process.env.BETTER_AUTH_URL || vercelUrl;

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL, vercelUrl, process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined].filter((x): x is string => !!x),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  advanced: { database: { generateId: () => crypto.randomUUID() } },
  plugins: [nextCookies()],
});
