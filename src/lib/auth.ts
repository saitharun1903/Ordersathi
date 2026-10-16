import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
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
  // Stored in Postgres so limits hold across serverless instances.
  rateLimit: { enabled: true, window: 60, max: 30, storage: "database", modelName: "rateLimit" },
  hooks: {
    // The shared sample accounts are public: nobody may change their password, email or profile.
    before: createAuthMiddleware(async (ctx) => {
      if (!["/change-password", "/change-email", "/update-user", "/delete-user", "/set-password"].includes(ctx.path)) return;
      const session = await getSessionFromCtx(ctx);
      if (session?.user.email.endsWith("@demo.ordersathi.in")) {
        throw new APIError("FORBIDDEN", { message: "The shared sample accounts can't be changed." });
      }
    }),
  },
  advanced: { database: { generateId: () => crypto.randomUUID() } },
  plugins: [nextCookies()],
});
