import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Ctx } from "../context";
import { AppError, notFound } from "../errors";
import { assertCan } from "../permissions";
import { audit } from "../audit";
import { deleteObject } from "../storage";

export const WorkspaceInputSchema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(120),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().max(60).default("Telangana"),
  preferredLanguage: z.enum(["AUTO", "EN", "TE"]).default("AUTO"),
});

export const SettingsInputSchema = WorkspaceInputSchema.extend({
  addressLine: z.string().trim().max(200).nullish().transform((v) => v || null),
  phone: z.string().trim().max(20).nullish().transform((v) => v || null),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .max(15)
    .nullish()
    .transform((v) => v || null)
    .refine((v) => !v || /^[0-9]{2}[A-Z0-9]{13}$/.test(v), "GSTIN should be 15 characters"),
  taxRatePercent: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v, c) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 28) {
        c.addIssue({ code: "custom", message: "Enter a rate between 0 and 28" });
        return z.NEVER;
      }
      return Math.round(n * 100);
    }),
  taxLabel: z.string().trim().max(40).nullish().transform((v) => v || null),
});

function fieldErrors(err: z.ZodError) {
  const fe: Record<string, string> = {};
  for (const i of err.issues) fe[i.path.join(".")] ??= i.message;
  return fe;
}

export async function createWorkspace(user: { id: string; name: string }, raw: unknown) {
  const r = WorkspaceInputSchema.safeParse(raw);
  if (!r.success) throw new AppError("VALIDATION", "Check the highlighted fields.", fieldErrors(r.error));
  return prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({ data: { ...r.data, onboardingStep: 1 } });
    await tx.membership.create({ data: { workspaceId: ws.id, userId: user.id, role: "OWNER" } });
    await tx.auditEvent.create({ data: { workspaceId: ws.id, actorId: user.id, actorName: user.name, type: "workspace.created" } });
    return ws.id;
  });
}

export async function updateSettings(ctx: Ctx, raw: unknown) {
  assertCan(ctx.role, "settings.manage");
  assertNotSample(ctx);
  const r = SettingsInputSchema.safeParse(raw);
  if (!r.success) throw new AppError("VALIDATION", "Check the highlighted fields.", fieldErrors(r.error));
  const { taxRatePercent, ...rest } = r.data;
  if (taxRatePercent !== null && !rest.taxLabel) throw new AppError("VALIDATION", "Name the tax line, e.g. “GST 18%”.", { taxLabel: "Required when a rate is set" });
  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({ where: { id: ctx.workspaceId }, data: { ...rest, taxRateBps: taxRatePercent } });
    await audit(tx, ctx, "settings.updated", { taxConfigured: taxRatePercent !== null });
  });
}

export async function setOnboardingStep(ctx: Ctx, step: number) {
  assertCan(ctx.role, "settings.manage");
  const s = z.number().int().min(0).max(5).parse(step);
  await prisma.workspace.updateMany({ where: { id: ctx.workspaceId }, data: { onboardingStep: s } });
}

export async function updateRetention(ctx: Ctx, days: number) {
  assertCan(ctx.role, "settings.manage");
  assertNotSample(ctx);
  if (!Number.isInteger(days) || days < 7 || days > 3650) throw new AppError("VALIDATION", "Choose between 7 and 3650 days.");
  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({ where: { id: ctx.workspaceId }, data: { sourceRetentionDays: days } });
    await audit(tx, ctx, "settings.retention_updated", { days });
  });
}

/** Delete stored source files older than the workspace's retention window. Orders and transcripts are kept. */
export async function purgeExpiredSources(workspaceId: string) {
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const cutoff = new Date(Date.now() - ws.sourceRetentionDays * 86400_000);
  const expired = await prisma.sourceUpload.findMany({ where: { workspaceId, purgedAt: null, storageKey: { not: null }, createdAt: { lt: cutoff } } });
  for (const u of expired) {
    await deleteObject(u.storageKey!).catch(() => {});
    await prisma.sourceUpload.update({ where: { id: u.id }, data: { purgedAt: new Date() } });
  }
  return expired.length;
}

export async function runPurgeNow(ctx: Ctx) {
  assertCan(ctx.role, "settings.manage");
  const n = await purgeExpiredSources(ctx.workspaceId);
  await prisma.auditEvent.create({ data: { workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, type: "retention.purged", data: { files: n } } });
  return n;
}

// ───────────────────────── Team ─────────────────────────

const INVITE_TTL_DAYS = 14;

function assertNotSample(ctx: Ctx) {
  if (ctx.isDemo) throw new AppError("INVALID_STATE", "Sample workspaces can't change team or business settings. Create your own workspace to do that.");
}

export async function listTeam(ctx: Ctx) {
  const [members, invites] = await Promise.all([
    prisma.membership.findMany({ where: { workspaceId: ctx.workspaceId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({
      where: { workspaceId: ctx.workspaceId, acceptedAt: null, revokedAt: null, createdAt: { gt: new Date(Date.now() - INVITE_TTL_DAYS * 86400_000) } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { members, invites };
}

const InviteSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email"), role: z.enum(["OWNER", "MANAGER", "OPERATOR"]) });

/**
 * Creates a pending invitation with a secret link. Nobody is added until they open the
 * link while signed in — email addresses are not verified, so they are never proof of identity.
 */
export async function inviteMember(ctx: Ctx, raw: unknown) {
  assertCan(ctx.role, "team.manage");
  assertNotSample(ctx);
  const r = InviteSchema.safeParse(raw);
  if (!r.success) throw new AppError("VALIDATION", "Check the highlighted fields.", fieldErrors(r.error));
  const { email, role } = r.data;
  return prisma.$transaction(async (tx) => {
    const member = await tx.membership.findFirst({ where: { workspaceId: ctx.workspaceId, user: { email } } });
    if (member) throw new AppError("VALIDATION", "This person is already a member.", { email: "Already a member" });
    await tx.invitation.updateMany({ where: { workspaceId: ctx.workspaceId, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    const token = randomBytes(24).toString("base64url");
    await tx.invitation.create({ data: { workspaceId: ctx.workspaceId, email, role, invitedById: ctx.userId, token } });
    await audit(tx, ctx, "team.invited", { email, role });
    return { token };
  });
}

export async function revokeInvite(ctx: Ctx, id: string) {
  assertCan(ctx.role, "team.manage");
  const r = await prisma.invitation.updateMany({ where: { id, workspaceId: ctx.workspaceId, acceptedAt: null }, data: { revokedAt: new Date() } });
  if (!r.count) throw notFound("Invitation");
}

/** Public details for the invite page (no secrets beyond what the link holder already has). */
export async function getInvite(token: string) {
  const inv = await prisma.invitation.findUnique({ where: { token }, include: { workspace: { select: { name: true } } } });
  if (!inv || inv.revokedAt || inv.acceptedAt || inv.createdAt < new Date(Date.now() - INVITE_TTL_DAYS * 86400_000)) return null;
  return { workspaceName: inv.workspace.name, role: inv.role, email: inv.email };
}

export async function acceptInvite(user: { id: string; name: string }, token: string) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invitation.findUnique({ where: { token } });
    if (!inv || inv.revokedAt || inv.acceptedAt || inv.createdAt < new Date(Date.now() - INVITE_TTL_DAYS * 86400_000)) {
      throw new AppError("NOT_FOUND", "This invitation link is no longer valid. Ask the owner for a new one.");
    }
    const claimed = await tx.invitation.updateMany({ where: { id: inv.id, acceptedAt: null }, data: { acceptedAt: new Date() } });
    if (!claimed.count) throw new AppError("CONFLICT", "This invitation was already used.");
    const exists = await tx.membership.findUnique({ where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId: user.id } } });
    if (!exists) await tx.membership.create({ data: { workspaceId: inv.workspaceId, userId: user.id, role: inv.role } });
    await tx.auditEvent.create({ data: { workspaceId: inv.workspaceId, actorId: user.id, actorName: user.name, type: "team.invite_accepted", data: { role: inv.role } } });
    return inv.workspaceId;
  });
}

/** Owner changes run serializably so two owners can't demote each other at the same time. */
async function withOwnerGuard(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<void>) {
  await prisma.$transaction(
    async (tx) => {
      await fn(tx);
      const owners = await tx.membership.count({ where: { workspaceId: ctx.workspaceId, role: "OWNER" } });
      if (owners < 1) throw new AppError("INVALID_STATE", "A workspace needs at least one owner.");
    },
    { isolationLevel: "Serializable" },
  );
}

export async function changeRole(ctx: Ctx, membershipId: string, role: Role) {
  assertCan(ctx.role, "team.manage");
  assertNotSample(ctx);
  if (!["OWNER", "MANAGER", "OPERATOR"].includes(role)) throw new AppError("VALIDATION", "Unknown role.");
  await withOwnerGuard(ctx, async (tx) => {
    const r = await tx.membership.updateMany({ where: { id: membershipId, workspaceId: ctx.workspaceId }, data: { role } });
    if (!r.count) throw notFound("Member");
    await audit(tx, ctx, "team.role_changed", { membershipId, role });
  });
}

export async function removeMember(ctx: Ctx, membershipId: string) {
  assertCan(ctx.role, "team.manage");
  assertNotSample(ctx);
  await withOwnerGuard(ctx, async (tx) => {
    const r = await tx.membership.deleteMany({ where: { id: membershipId, workspaceId: ctx.workspaceId } });
    if (!r.count) throw notFound("Member");
    await audit(tx, ctx, "team.member_removed", { membershipId });
  });
}
