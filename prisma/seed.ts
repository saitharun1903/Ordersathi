// Seeds the sample workspace and demo users. All business data is fictional demo data.
// Usage: npm run db:seed   (idempotent: removes and recreates the demo users' sample workspace)
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { seedDemoWorkspace } from "../src/server/demo/seed-demo";

const prisma = new PrismaClient();
export const DEMO_PASSWORD = "ordersathi-demo";

const USERS = [
  { email: "owner@demo.ordersathi.in", name: "Lakshmi Narayana", role: "OWNER" as const },
  { email: "manager@demo.ordersathi.in", name: "Kiran Kumar", role: "MANAGER" as const },
  { email: "operator@demo.ordersathi.in", name: "Sravani", role: "OPERATOR" as const },
];

async function upsertUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  const id = crypto.randomUUID();
  const user = await prisma.user.create({ data: { id, email, name, emailVerified: true } });
  await prisma.account.create({
    data: { id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(DEMO_PASSWORD) },
  });
  return user;
}

async function main() {
  if (process.argv.includes("--if-missing")) {
    const owner = await prisma.user.findUnique({ where: { email: USERS[0].email }, include: { memberships: { include: { workspace: true } } } });
    if (owner?.memberships.some((m) => m.workspace.isDemo)) {
      console.log("Sample workspace already exists — skipping seed.");
      return;
    }
  }
  const users = [];
  for (const u of USERS) users.push({ ...(await upsertUser(u.email, u.name)), role: u.role });
  const owner = users[0];

  // Remove previous sample workspaces owned by the demo owner.
  const old = await prisma.workspace.findMany({ where: { isDemo: true, memberships: { some: { userId: owner.id, role: "OWNER" } } } });
  for (const w of old) await prisma.workspace.delete({ where: { id: w.id } });

  const wsId = await seedDemoWorkspace(prisma, {
    owner: { id: owner.id, name: owner.name },
    others: users.slice(1).map((u) => ({ id: u.id, name: u.name, role: u.role })),
  });
  const counts = await prisma.order.groupBy({ by: ["status"], where: { workspaceId: wsId }, _count: true });
  console.log("Sample workspace ready:", wsId);
  console.table(counts.map((c) => ({ status: c.status, orders: c._count })));
  console.log(`Sign in with ${USERS.map((u) => u.email).join(", ")} — password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
