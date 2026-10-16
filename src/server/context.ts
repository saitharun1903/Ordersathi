import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "./errors";

export const WORKSPACE_COOKIE = "os_ws";

export type Ctx = {
  userId: string;
  userName: string;
  userEmail: string;
  workspaceId: string;
  workspaceName: string;
  role: Role;
  isDemo: boolean;
};

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Resolve the active workspace for the signed-in user. The workspace id in the
 * cookie is only a preference — membership is always verified in the database.
 */
export const getContext = cache(async (): Promise<Ctx | null> => {
  const session = await getSession();
  if (!session) return null;
  const jar = await cookies();
  const preferred = jar.get(WORKSPACE_COOKIE)?.value;
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { workspace: { select: { id: true, name: true, isDemo: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!memberships.length) return null;
  const m = memberships.find((x) => x.workspaceId === preferred) ?? memberships.find((x) => !x.workspace.isDemo) ?? memberships[0];
  return {
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    workspaceId: m.workspaceId,
    workspaceName: m.workspace.name,
    role: m.role,
    isDemo: m.workspace.isDemo,
  };
});

/** For pages: redirect to sign-in / onboarding when needed. */
export async function requirePageContext(): Promise<Ctx> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const ctx = await getContext();
  if (!ctx) redirect("/onboarding");
  return ctx;
}

/** For actions and route handlers: throw instead of redirecting. */
export async function requireContext(): Promise<Ctx> {
  const ctx = await getContext();
  if (!ctx) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
  return ctx;
}
