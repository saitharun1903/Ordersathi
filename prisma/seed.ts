// Seeds the shared sample workspace and demo users. All business data is fictional demo data.
// Usage: npm run db:seed              (recreates the sample workspace)
//        npm run db:seed -- --if-missing   (only when it doesn't exist yet; used by vercel-build)
import { PrismaClient } from "@prisma/client";
import { DEMO_PASSWORD, DEMO_USERS, resetSharedDemo, sharedDemoExists } from "../src/server/demo/shared-demo";

const prisma = new PrismaClient();

async function main() {
  if (process.argv.includes("--if-missing") && (await sharedDemoExists(prisma))) {
    console.log("Sample workspace already exists — skipping seed.");
    return;
  }
  const wsId = await resetSharedDemo(prisma);
  const counts = await prisma.order.groupBy({ by: ["status"], where: { workspaceId: wsId }, _count: true });
  console.log("Sample workspace ready:", wsId);
  console.table(counts.map((c) => ({ status: c.status, orders: c._count })));
  console.log(`Sign in with ${DEMO_USERS.map((u) => u.email).join(", ")} — password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
