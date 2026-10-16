import { prisma } from "@/lib/db";
import { seedDemoWorkspace } from "@/server/demo/seed-demo";
import type { Ctx } from "@/server/context";
import type { Role } from "@prisma/client";

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

async function user(name: string) {
  return prisma.user.create({ data: { id: crypto.randomUUID(), name, email: `${name.toLowerCase().replace(/\s/g, ".")}.${Date.now()}@test.local` } });
}

export type World = Awaited<ReturnType<typeof buildWorld>>;

export async function buildWorld() {
  await resetDb();
  const [owner, manager, operator, otherOwner] = await Promise.all([user("Owner A"), user("Manager A"), user("Operator A"), user("Owner B")]);
  const wsA = await seedDemoWorkspace(prisma, {
    owner,
    others: [
      { ...manager, role: "MANAGER" },
      { ...operator, role: "OPERATOR" },
    ],
  });
  const wsB = await seedDemoWorkspace(prisma, { owner: otherOwner }, { name: "Other Wholesaler (Demo)" });
  const ctx = (u: { id: string; name: string }, workspaceId: string, role: Role): Ctx => ({ userId: u.id, userName: u.name, userEmail: "", workspaceId, workspaceName: "", role, isDemo: true });
  return {
    wsA,
    wsB,
    ownerA: ctx(owner, wsA, "OWNER"),
    managerA: ctx(manager, wsA, "MANAGER"),
    operatorA: ctx(operator, wsA, "OPERATOR"),
    ownerB: ctx(otherOwner, wsB, "OWNER"),
  };
}

export async function product(workspaceId: string, sku: string) {
  return prisma.product.findUniqueOrThrow({ where: { workspaceId_sku: { workspaceId, sku } } });
}
export async function customer(workspaceId: string, name: string) {
  return prisma.customer.findFirstOrThrow({ where: { workspaceId, name: { startsWith: name } } });
}
export async function orderByNumber(workspaceId: string, number: number) {
  return prisma.order.findUniqueOrThrow({ where: { workspaceId_number: { workspaceId, number } }, include: { lines: { orderBy: { position: "asc" } } } });
}
