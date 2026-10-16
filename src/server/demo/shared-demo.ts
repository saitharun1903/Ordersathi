import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { seedDemoWorkspace } from "./seed-demo";

// The public sample workspace and its three demo users. All data is fictional.
export const DEMO_PASSWORD = "ordersathi-demo";
export const DEMO_USERS = [
  { email: "owner@demo.ordersathi.in", name: "Lakshmi Narayana", role: "OWNER" as const },
  { email: "manager@demo.ordersathi.in", name: "Kiran Kumar", role: "MANAGER" as const },
  { email: "operator@demo.ordersathi.in", name: "Sravani", role: "OPERATOR" as const },
];

async function upsertUser(prisma: PrismaClient, email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  const id = crypto.randomUUID();
  const user = await prisma.user.create({ data: { id, email, name, emailVerified: true } });
  await prisma.account.create({ data: { id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(DEMO_PASSWORD) } });
  return user;
}

export async function sharedDemoExists(prisma: PrismaClient) {
  const owner = await prisma.user.findUnique({ where: { email: DEMO_USERS[0].email }, include: { memberships: { include: { workspace: true } } } });
  return !!owner?.memberships.some((m) => m.workspace.isDemo);
}

/** Recreates the shared sample workspace from scratch (drops what visitors changed or uploaded). */
export async function resetSharedDemo(prisma: PrismaClient) {
  const users = [];
  for (const u of DEMO_USERS) users.push({ ...(await upsertUser(prisma, u.email, u.name)), role: u.role });
  const owner = users[0];
  const old = await prisma.workspace.findMany({ where: { isDemo: true, memberships: { some: { userId: owner.id, role: "OWNER" } } }, select: { id: true } });
  for (const w of old) {
    await prisma.storedFile.deleteMany({ where: { workspaceId: w.id } });
    await prisma.workspace.delete({ where: { id: w.id } });
  }
  return seedDemoWorkspace(prisma, {
    owner: { id: owner.id, name: owner.name },
    others: users.slice(1).map((u) => ({ id: u.id, name: u.name, role: u.role })),
  });
}
