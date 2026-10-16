// Vercel build: generate client → apply migrations → seed sample workspace if missing → next build.
import { existsSync } from "node:fs";
if (existsSync(".env") && !process.env.VERCEL) (await import("dotenv")).config();
import { execSync } from "node:child_process";
import path from "node:path";
import { resolveDatabaseUrls } from "./db-url.mjs";

const { pooled, direct } = resolveDatabaseUrls();
if (!pooled) {
  console.error(
    "\n✖ No database configured.\n" +
      "  Add Postgres in Vercel: Project → Storage → Neon (or set DATABASE_URL in Environment Variables),\n" +
      "  make sure it is connected to this environment (Production/Preview), then redeploy.\n",
  );
  process.exit(1);
}
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
