"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, WORKSPACE_COOKIE } from "../context";
import { AppError } from "../errors";
import { run, toResult } from "./run";
import * as ws from "../workspace/service";
import { seedDemoWorkspace } from "../demo/seed-demo";

async function setWorkspaceCookie(id: string) {
  (await cookies()).set(WORKSPACE_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function switchWorkspaceAction(workspaceId: string) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
    const m = await prisma.membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId: session.user.id } } });
    if (!m) throw new AppError("FORBIDDEN", "You are not a member of that workspace.");
    await setWorkspaceCookie(workspaceId);
    revalidatePath("/", "layout");
    return { ok: true as const, data: null };
  } catch (e) {
    return toResult("workspace.switch", e);
  }
}

export async function createWorkspaceAction(input: unknown) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
    const id = await ws.createWorkspace({ id: session.user.id, name: session.user.name }, input);
    await setWorkspaceCookie(id);
    return { ok: true as const, data: { id } };
  } catch (e) {
    return toResult("workspace.create", e);
  }
}

/** Creates a private copy of the sample workspace for the signed-in user. */
export async function createSampleWorkspaceAction() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
    const existing = await prisma.membership.findFirst({ where: { userId: session.user.id, role: "OWNER", workspace: { isDemo: true } } });
    const id = existing?.workspaceId ?? (await seedDemoWorkspace(prisma, { owner: { id: session.user.id, name: session.user.name } }, { name: "Sri Lakshmi Electricals (Sample)" }));
    await setWorkspaceCookie(id);
    return { ok: true as const, data: { id } };
  } catch (e) {
    return toResult("workspace.sample", e);
  }
}

export async function acceptInviteAction(token: string) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Please sign in to accept the invitation.");
    const id = await ws.acceptInvite({ id: session.user.id, name: session.user.name }, String(token).slice(0, 100));
    await setWorkspaceCookie(id);
    return { ok: true as const, data: { id } };
  } catch (e) {
    return toResult("invite.accept", e);
  }
}

export async function updateSettingsAction(input: unknown) {
  return run("settings.update", async (ctx) => {
    await ws.updateSettings(ctx, input);
    revalidatePath("/", "layout");
  });
}
export async function setOnboardingStepAction(step: number) {
  return run("onboarding.step", (ctx) => ws.setOnboardingStep(ctx, step));
}
export async function updateRetentionAction(days: number) {
  return run("retention.update", (ctx) => ws.updateRetention(ctx, days));
}
export async function runPurgeAction() {
  return run("retention.purge", (ctx) => ws.runPurgeNow(ctx));
}
export async function inviteMemberAction(input: unknown) {
  return run("team.invite", (ctx) => ws.inviteMember(ctx, input));
}
export async function revokeInviteAction(id: string) {
  return run("team.revoke", (ctx) => ws.revokeInvite(ctx, id));
}
export async function changeRoleAction(membershipId: string, role: "OWNER" | "MANAGER" | "OPERATOR") {
  return run("team.role", (ctx) => ws.changeRole(ctx, membershipId, role));
}
export async function removeMemberAction(membershipId: string) {
  return run("team.remove", (ctx) => ws.removeMember(ctx, membershipId));
}
