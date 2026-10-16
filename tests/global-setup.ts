import { execSync } from "node:child_process";
import { config } from "dotenv";

export default function setup() {
  const env = config({ path: ".env.test", processEnv: {} }).parsed ?? {};
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: env.DATABASE_URL, DATABASE_URL_UNPOOLED: env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL }, stdio: "inherit" });
}
