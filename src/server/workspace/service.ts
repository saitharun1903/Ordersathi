import "server-only";
import type { Role } from "@prisma/client";
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
  await prisma.workspace.updateMany({ where: { id: ctx.workspaceId }, data: { onboardingStep: step } });
}

export async function updateRetention(ctx: Ctx, days: number) {
  assertCan(ctx.role, "settings.manage");
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

export async function listTeam(ctx: Ctx) {
  const [members, invites] = await Promise.all([
    prisma.membership.findMany({ where: { workspaceId: ctx.workspaceId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { workspaceId: ctx.workspaceId, acceptedAt: null, revokedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);
  return { members, invites };
}

const InviteSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email"), role: z.enum(["OWNER", "MANAGER", "OPERATOR"]) });

export async function inviteMember(ctx: Ctx, raw: unknown) {
  assertCan(ctx.role, "team.manage");
  const r = InviteSchema.safeParse(raw);
  if (!r.success) throw new AppError("VALIDATION", "Check the highlighted fields.", fieldErrors(r.error));
  const { email, role } = r.data;
  const user = await prisma.user.findUnique({ where: { email } });
  return prisma.$transaction(async (tx) => {
    if (user) {
      const existing = await tx.membership.findUnique({ where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: user.id } } });
      if (existing) throw new AppError("VALIDATION", "This person is already a member.", { email: "Already a member" });
      await tx.membership.create({ data: { workspaceId: ctx.workspaceId, userId: user.id, role } });
      await audit(tx, ctx, "team.member_added", { email, role });
      return { added: true };
    }
    const pending = await tx.invitation.findFirst({ where: { workspaceId: ctx.workspaceId, email, acceptedAt: null, revokedAt: null } });
    if (pending) throw new AppError("VALIDATION", "An invitation is already pending for this email.", { email: "Already invited" });
    await tx.invitation.create({ data: { workspaceId: ctx.workspaceId, email, role, invitedById: ctx.userId } });
    await audit(tx, ctx, "team.invited", { email, role });
    return { added: false };
  });
}

export async function revokeInvite(ctx: Ctx, id: string) {
  assertCan(ctx.role, "team.manage");
  const r = await prisma.invitation.updateMany({ where: { id, workspaceId: ctx.workspaceId, acceptedAt: null }, data: { revokedAt: new Date() } });
  if (!r.count) throw notFound("Invitation");
}

async function ownerCount(workspaceId: string) {
  return prisma.membership.count({ where: { workspaceId, role: "OWNER" } });
}

export async function changeRole(ctx: Ctx, membershipId: string, role: Role) {
  assertCan(ctx.role, "team.manage");
  const m = await prisma.membership.findFirst({ where: { id: membershipId, workspaceId: ctx.workspaceId } });
  if (!m) throw notFound("Member");
  if (m.role === "OWNER" && role !== "OWNER" && (await ownerCount(ctx.workspaceId)) <= 1) {
    throw new AppError("INVALID_STATE", "A workspace needs at least one owner.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.membership.update({ where: { id: m.id }, data: { role } });
    await audit(tx, ctx, "team.role_changed", { membershipId, role });
  });
}

export async function removeMember(ctx: Ctx, membershipId: string) {
  assertCan(ctx.role, "team.manage");
  const m = await prisma.membership.findFirst({ where: { id: membershipId, workspaceId: ctx.workspaceId } });
  if (!m) throw notFound("Member");
  if (m.role === "OWNER" && (await ownerCount(ctx.workspaceId)) <= 1) throw new AppError("INVALID_STATE", "A workspace needs at least one owner.");
  await prisma.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: m.id } });
    await audit(tx, ctx, "team.member_removed", { membershipId });
  });
}

/** Accept pending invitations addressed to this user's email. */
export async function acceptInvitesFor(user: { id: string; email: string }) {
  const invites = await prisma.invitation.findMany({ where: { email: user.email.toLowerCase(), acceptedAt: null, revokedAt: null } });
  for (const inv of invites) {
    await prisma.$transaction(async (tx) => {
      const exists = await tx.membership.findUnique({ where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId: user.id } } });
      if (!exists) await tx.membership.create({ data: { workspaceId: inv.workspaceId, userId: user.id, role: inv.role } });
      await tx.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
    });
  }
  return invites.length;
}
