// Vercel build: generate client → apply migrations → seed sample workspace if missing → next build.
import { existsSync } from "node:fs";
if (existsSync(".env") && !process.env.VERCEL) (await import("dotenv")).config();
import { execSync } from "node:child_process";
import path from "node:path";
import { databaseVarNames, resolveDatabaseUrls } from "./db-url.mjs";

const { pooled, direct, pooledName, directName } = resolveDatabaseUrls();
const vercelEnv = process.env.VERCEL_ENV ?? "local";
if (!pooled) {
  const seen = databaseVarNames();
  console.error(
    `\n✖ No database URL found for this "${vercelEnv}" build.\n` +
      `  Database-related variables visible to the build: ${seen.length ? seen.join(", ") : "none"}\n` +
      `  Fix: Project → Storage → your Neon database → Settings/Projects → make sure this project is connected\n` +
      `  for the "${vercelEnv}" environment (or add DATABASE_URL under Settings → Environment Variables for "${vercelEnv}").\n` +
      "  Then start a new deployment of the latest commit.\n",
  );
  process.exit(1);
}
console.log(`Database: runtime uses ${pooledName}, migrations use ${directName} (${vercelEnv} build).`);
// The app reads DATABASE_URL; map a prefixed or alternative name onto it for build steps.
process.env.DATABASE_URL = pooled;
const missing = ["BETTER_AUTH_SECRET"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n✖ Missing environment variables: ${missing.join(", ")}. Add them in Project → Settings → Environment Variables, then redeploy.\n`);
  process.exit(1);
}

const PATH = `${path.resolve("node_modules/.bin")}${path.delimiter}${process.env.PATH ?? ""}`;
const run = (cmd, extra = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, PATH, ...extra } });
run("prisma generate");
run("prisma migrate deploy", { DATABASE_URL: direct });
run("tsx prisma/seed.ts --if-missing", { DATABASE_URL: pooled, NODE_OPTIONS: "--conditions=react-server" });
run("next build", { DATABASE_URL: pooled });
