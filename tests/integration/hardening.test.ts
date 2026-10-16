import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AppError } from "@/server/errors";
import type { Ctx } from "@/server/context";
import { acceptInvite, changeRole, createWorkspace, getInvite, inviteMember, listTeam, removeMember, setOnboardingStep } from "@/server/workspace/service";
import { addLine, approveOrder, createIntake, updateLine } from "@/server/orders/service";
import { MAX_ATTEMPTS, runJob } from "@/server/orders/pipeline";
import { getOrderView } from "@/server/orders/view";
import { buildWorld, orderByNumber, product, type World } from "./fixtures";

let w: World;
let live: Ctx;
let stranger: { id: string; name: string };

beforeAll(async () => {
  w = await buildWorld();
  const owner = await prisma.user.create({ data: { id: crypto.randomUUID(), name: "Live Owner", email: `live.${Date.now()}@test.local` } });
  stranger = await prisma.user.create({ data: { id: crypto.randomUUID(), name: "New Hire", email: `hire.${Date.now()}@test.local` } });
  const wsId = await createWorkspace(owner, { name: "Ganesh Electricals", city: "Guntur" });
  live = { userId: owner.id, userName: owner.name, userEmail: owner.email, workspaceId: wsId, workspaceName: "Ganesh Electricals", role: "OWNER", isDemo: false };
}, 60_000);

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    return e instanceof AppError ? e.code : (e as Error).name;
  }
};

describe("team invitations", () => {
  it("only adds people who open the secret link, and each link works once", async () => {
    const { token } = await inviteMember(live, { email: "someone@shop.in", role: "MANAGER" });
    expect(token.length).toBeGreaterThanOrEqual(30);
    expect((await listTeam(live)).members).toHaveLength(1); // nobody added yet
    expect(await getInvite(token)).toMatchObject({ workspaceName: "Ganesh Electricals", role: "MANAGER" });

    const joined = await acceptInvite(stranger, token);
    expect(joined).toBe(live.workspaceId);
    const m = await prisma.membership.findUnique({ where: { workspaceId_userId: { workspaceId: live.workspaceId, userId: stranger.id } } });
    expect(m?.role).toBe("MANAGER");
    expect(await code(acceptInvite(stranger, token))).toBe("NOT_FOUND");
    expect(await code(acceptInvite(stranger, "made-up-token"))).toBe("NOT_FOUND");
  });

  it("keeps team changes owner-only and blocked in sample workspaces", async () => {
    expect(await code(inviteMember({ ...live, role: "MANAGER" }, { email: "x@y.in", role: "OWNER" }))).toBe("FORBIDDEN");
    expect(await code(inviteMember(w.ownerA, { email: "x@y.in", role: "OWNER" }))).toBe("INVALID_STATE");
    expect(await code(setOnboardingStep(w.operatorA, 0))).toBe("FORBIDDEN");
  });

  it("never leaves a workspace without an owner", async () => {
    const own = await prisma.membership.findFirstOrThrow({ where: { workspaceId: live.workspaceId, role: "OWNER" } });
    expect(await code(changeRole(live, own.id, "OPERATOR"))).toBe("INVALID_STATE");
    expect(await code(removeMember(live, own.id))).toBe("INVALID_STATE");
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: own.id } })).role).toBe("OWNER");
  });
});

describe("processing safety", () => {
  it("closes out a job that keeps dying instead of retrying forever", async () => {
    const r = await createIntake(w.operatorA, { idempotencyKey: `t-${crypto.randomUUID()}`, inputType: "TEXT", text: "tape 2 pkt" });
    await prisma.processingJob.update({ where: { id: r.jobId! }, data: { status: "RUNNING", attempts: MAX_ATTEMPTS, leaseUntil: new Date(Date.now() - 1000) } });
    await runJob(r.jobId!);
    const job = await prisma.processingJob.findUniqueOrThrow({ where: { id: r.jobId! } });
    expect(job).toMatchObject({ status: "FAILED", errorCode: "TIMEOUT", retryable: true });
  });

  it("rejects edits and approval while processing is still running", async () => {
    const r = await createIntake(w.operatorA, { idempotencyKey: `t-${crypto.randomUUID()}`, inputType: "TEXT", text: "Havells 8 way DB 2" });
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.orderId } });
    const p = await product(w.wsA, "PHI-LED-9W");
    expect(await code(addLine(w.operatorA, o.id, o.version, { productId: p.id }))).toBe("INVALID_STATE");
    expect(await code(approveOrder(w.managerA, o.id, o.version))).toBe("INVALID_STATE");
    await runJob(r.jobId!);
    const v = await getOrderView(w.operatorA, r.orderId);
    expect(v.latestJob?.status).toBe("SUCCEEDED");
  });

  it("flags an absurd quantity instead of crashing on overflow", async () => {
    const o = await orderByNumber(w.wsA, 13);
    const fan = await product(w.wsA, "HAV-FAN-1200-WH");
    await addLine(w.ownerA, o.id, o.version, { productId: fan.id, quantity: "9999999" });
    const v = await getOrderView(w.ownerA, o.id);
    const line = v.lines.find((l) => l.product?.id === fan.id)!;
    expect(line.issues.map((i) => i.message)).toContain("This line is over ₹1 crore — check the quantity");
    expect(line.lineTotalPaise).toBeNull();
    await updateLine(w.ownerA, o.id, v.version, line.id, { quantity: "2" });
    expect((await getOrderView(w.ownerA, o.id)).lines.find((l) => l.id === line.id)?.lineTotalPaise).toBe(2 * fan.pricePaise);
  });
});
