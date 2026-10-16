import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient, Role } from "@prisma/client";
import { normalizeText } from "@/lib/normalize";
import type { Ctx } from "../context";
import { putObject, validateUpload } from "../storage";
import { runJob } from "../orders/pipeline";
import { approveOrder, rejectOrder, updateLine } from "../orders/service";
import { DEMO_CUSTOMER_ALIASES, DEMO_CUSTOMER_PRICES, DEMO_CUSTOMERS, DEMO_PRODUCTS } from "./catalogue-data";
import { FIXTURES } from "../ai/fixtures";

type DemoOrder = {
  customer: string | null;
  type: "TEXT" | "AUDIO" | "IMAGE";
  text?: string;
  fixture?: string;
  daysAgo: number;
  hour: number;
  target: "OPEN" | "APPROVED" | "REJECTED" | "FAILED";
  by?: "owner" | "operator";
  resolve?: { line: number; sku: string }[];
};

// All orders, customers and prices below are fictional demo data.
const ORDERS: DemoOrder[] = [
  { customer: "lakshmi", type: "TEXT", daysAgo: 9, hour: 11, target: "APPROVED", text: "Anchor Roma 16A switch 10\nAnchor Roma 16A socket 10\n4 sq mm red polycab 3 rolls" },
  { customer: "metro", type: "TEXT", daysAgo: 6, hour: 10, target: "APPROVED", text: "site wire 15 rolls, 3 core flexible cable 200 m, 20mm pvc pipe 100" },
  { customer: "venkat", type: "TEXT", daysAgo: 5, hour: 16, target: "REJECTED", text: "crompton fan 4, havells fan 2, anchor fan regulator 6, 6 module plate 10" },
  { customer: "sai", type: "TEXT", daysAgo: 4, hour: 12, target: "APPROVED", text: "maamulu switch 20, anchor 6a socket 10, tape 2 pkt" },
  { customer: "lakshmi", type: "TEXT", daysAgo: 3, hour: 9, target: "APPROVED", text: "పది ఆంకర్ 6A 1 way స్విచ్‌లు\nఐదు హావెల్స్ 16A సాకెట్లు\nరెండు చుట్టలు పాలీక్యాబ్ 2.5 ఎర్ర వైరు" },
  { customer: "bright", type: "TEXT", daysAgo: 1, hour: 15, target: "APPROVED", by: "operator", text: "philips 9w bulb 5 box, wipro 20w batten 20, anchor b22 holder 2 box" },
  { customer: "green", type: "TEXT", daysAgo: 1, hour: 18, target: "OPEN", text: "Send ten switches, five sockets and two rolls of wire." },
  { customer: "raju", type: "TEXT", daysAgo: 0, hour: 9, target: "OPEN", by: "operator", text: "Havells 32A DP MCB x 2\nLegrand 16 amp MCB - 6\nGI earthing wire 8 swg 5 kg\n15 pcs tape" },
  { customer: "sri", type: "TEXT", daysAgo: 0, hour: 10, target: "OPEN", text: "rendu rolls polycab 2.5 wire, padi 6a switchlu, oka fan regulator, crompton fan 2" },
  { customer: "bright", type: "TEXT", daysAgo: 0, hour: 10, target: "OPEN", text: "10A socket 4 nos, 12w philips bulb 3 box, spike guard 5" },
  { customer: "metro", type: "TEXT", daysAgo: 0, hour: 11, target: "OPEN", text: "Need for Gachibowli site:\n2.5 sq mm red wire Polycab - 10 rolls\n1.5 sq mm red wire polycab 6 rolls\nHavells 16A SP MCB 12 nos\nHavells 8 way DB 2" },
  { customer: "green", type: "TEXT", daysAgo: 0, hour: 11, target: "OPEN", by: "operator", text: "flexible cable 2 coil, cable ties 5 pkt, 5 katta wire, 9w bulb 10" },
  { customer: null, type: "TEXT", daysAgo: 0, hour: 12, target: "OPEN", by: "operator", text: "Philips 9W bulb 20\nAnchor b22 holder 20\nAnchor 6A plug top 1 box" },
  { customer: "sai", type: "AUDIO", fixture: "voice-sai-en", daysAgo: 0, hour: 12, target: "OPEN" },
  { customer: "venkat", type: "IMAGE", fixture: "photo-venkat-mixed", daysAgo: 0, hour: 13, target: "OPEN", by: "operator" },
  { customer: "raju", type: "AUDIO", daysAgo: 0, hour: 13, target: "FAILED", by: "operator" },
];

function at(daysAgo: number, hour: number) {
  // hour is IST wall-clock time
  const d = new Date();
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  ist.setUTCDate(ist.getUTCDate() - daysAgo);
  ist.setUTCHours(hour, (daysAgo * 7 + hour * 13) % 60, 0, 0);
  const t = new Date(ist.getTime() - 5.5 * 3600_000);
  return t > d ? new Date(d.getTime() - 5 * 60_000) : t;
}

export async function seedDemoWorkspace(
  prisma: PrismaClient,
  members: { owner: { id: string; name: string }; others?: { id: string; name: string; role: Role }[] },
  opts: { name?: string } = {},
) {
  const ws = await prisma.workspace.create({
    data: {
      name: opts.name ?? "Sri Lakshmi Electricals (Demo)",
      city: "Hyderabad",
      state: "Telangana",
      addressLine: "12-2-417, Gunfoundry, Abids (demo address)",
      phone: "+91 40 0000 0000",
      preferredLanguage: "AUTO",
      isDemo: true,
      onboardingStep: 5,
    },
  });
  await prisma.membership.create({ data: { workspaceId: ws.id, userId: members.owner.id, role: "OWNER" } });
  for (const m of members.others ?? []) await prisma.membership.create({ data: { workspaceId: ws.id, userId: m.id, role: m.role } });

  const productIds = new Map<string, string>();
  for (const p of DEMO_PRODUCTS) {
    const row = await prisma.product.create({
      data: {
        workspaceId: ws.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        brand: p.brand,
        specs: p.specs,
        sellingUnit: p.sellingUnit,
        pricePaise: Math.round(p.price * 100),
        aliases: { create: (p.aliases ?? []).map((a) => ({ workspaceId: ws.id, text: a.text, normalized: normalizeText(a.text), language: a.language })) },
        conversions: { create: Object.entries(p.conversions ?? {}).map(([unit, factor]) => ({ unit, factor: String(factor) })) },
      },
    });
    productIds.set(p.sku, row.id);
  }
  const customerIds = new Map<string, string>();
  for (const c of DEMO_CUSTOMERS) {
    const { key, ...data } = c;
    const row = await prisma.customer.create({ data: { ...data, workspaceId: ws.id } });
    customerIds.set(key, row.id);
  }
  for (const cp of DEMO_CUSTOMER_PRICES) {
    await prisma.customerPrice.create({
      data: { workspaceId: ws.id, customerId: customerIds.get(cp.customer)!, productId: productIds.get(cp.sku)!, pricePaise: Math.round(cp.price * 100) },
    });
  }
  for (const a of DEMO_CUSTOMER_ALIASES) {
    await prisma.productAlias.create({
      data: { workspaceId: ws.id, customerId: customerIds.get(a.customer)!, productId: productIds.get(a.sku)!, text: a.text, normalized: normalizeText(a.text), language: a.language },
    });
  }

  const operator = members.others?.find((m) => m.role === "OPERATOR");
  const manager = members.others?.find((m) => m.role === "MANAGER") ?? members.owner;
  const ctxFor = (u: { id: string; name: string }, role: Role): Ctx => ({
    userId: u.id,
    userName: u.name,
    userEmail: "",
    workspaceId: ws.id,
    workspaceName: ws.name,
    role,
    isDemo: true,
  });
  const approver = ctxFor(manager, "MANAGER");

  let seq = 0;
  for (const o of ORDERS) {
    seq += 1;
    const creator = o.by === "operator" && operator ? operator : members.owner;
    const createdAt = at(o.daysAgo, o.hour);
    const fixture = o.fixture ? FIXTURES.find((f) => f.id === o.fixture)! : null;
    let upload: { storageKey: string | null; mimeType: string; sizeBytes: number; sha256: string | null; originalName: string | null } = {
      storageKey: null,
      mimeType: "text/plain",
      sizeBytes: o.text?.length ?? 0,
      sha256: null,
      originalName: null,
    };
    if (o.type !== "TEXT") {
      const file = fixture ? fixture.file : "unsupported-voice-note.wav";
      const buf = await readFile(path.join(process.cwd(), "public", "samples", file));
      const v = validateUpload(o.type, buf);
      const put = await putObject(ws.id, v.ext, buf);
      upload = { storageKey: put.key, mimeType: v.mimeType, sizeBytes: buf.length, sha256: put.sha256, originalName: file };
    }
    const su = await prisma.sourceUpload.create({ data: { workspaceId: ws.id, kind: o.type, createdById: creator.id, createdAt, ...upload } });
    const transcript = o.type === "TEXT" ? o.text! : fixture?.transcript ?? null;
    const order = await prisma.order.create({
      data: {
        workspaceId: ws.id,
        number: seq,
        customerId: o.customer ? customerIds.get(o.customer)! : null,
        inputType: o.type,
        sourceText: o.type === "TEXT" ? o.text : null,
        transcript,
        sourceUploadId: su.id,
        idempotencyKey: `demo-${ws.id}-${seq}`,
        createdById: creator.id,
        createdAt,
      },
    });
    await prisma.auditEvent.create({
      data: { workspaceId: ws.id, orderId: order.id, actorId: creator.id, actorName: creator.name, type: "order.created", data: { inputType: o.type }, createdAt },
    });

    if (o.target === "FAILED") {
      await prisma.processingJob.create({
        data: {
          workspaceId: ws.id,
          orderId: order.id,
          sourceUploadId: su.id,
          kind: "INTAKE",
          status: "FAILED",
          stage: "TRANSCRIBING",
          attempts: 1,
          errorCode: "UNSUPPORTED_DEMO_INPUT",
          errorMessage:
            "Voice transcription needs a connected provider. In demo mode only the sample voice notes can be transcribed. You can type what the customer said into the transcript and process it.",
          retryable: false,
          createdById: creator.id,
          createdAt,
          finishedAt: createdAt,
        },
      });
      continue;
    }

    // Process through the real pipeline using the deterministic parser (no AI calls while seeding).
    const job = await prisma.processingJob.create({
      data: { workspaceId: ws.id, orderId: order.id, sourceUploadId: su.id, kind: "REPROCESS", provider: "rules", createdById: creator.id, createdAt },
    });
    await runJob(job.id);
    await prisma.processingJob.update({ where: { id: job.id }, data: { kind: "INTAKE", provider: o.type === "TEXT" ? "rules" : "demo-fixtures + rules" } });
    await prisma.auditEvent.updateMany({ where: { orderId: order.id, type: { in: ["order.processed", "order.reprocessed"] } }, data: { type: "order.processed", createdAt: new Date(createdAt.getTime() + 20_000) } });

    for (const r of o.resolve ?? []) {
      const lines = await prisma.orderLine.findMany({ where: { orderId: order.id }, orderBy: { position: "asc" } });
      const cur = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      await updateLine(approver, order.id, cur.version, lines[r.line].id, { productId: productIds.get(r.sku)! });
    }

    if (o.target === "APPROVED") {
      const cur = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      if (cur.status !== "READY_FOR_REVIEW") {
        console.warn(`[seed] order ${seq} expected READY_FOR_REVIEW, got ${cur.status}`);
        continue;
      }
      await approveOrder(approver, order.id, cur.version);
      const approvedAt = new Date(createdAt.getTime() + 47 * 60_000);
      await prisma.order.update({ where: { id: order.id }, data: { approvedAt } });
      await prisma.auditEvent.updateMany({ where: { orderId: order.id, type: "order.approved" }, data: { createdAt: approvedAt } });
      const snap = (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).approvedSnapshot as Record<string, unknown>;
      await prisma.order.update({ where: { id: order.id }, data: { approvedSnapshot: { ...snap, approvedAt: approvedAt.toISOString() } } });
    } else if (o.target === "REJECTED") {
      const cur = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      await rejectOrder(approver, order.id, cur.version, "Customer cancelled — fans ordered from another supplier.");
      const t = new Date(createdAt.getTime() + 2 * 3600_000);
      await prisma.order.update({ where: { id: order.id }, data: { rejectedAt: t } });
      await prisma.auditEvent.updateMany({ where: { orderId: order.id, type: "order.rejected" }, data: { createdAt: t } });
    }
    await prisma.auditEvent.updateMany({
      where: { orderId: order.id, createdAt: { gt: new Date(Date.now() - 60_000) }, type: { notIn: ["order.approved", "order.rejected"] } },
      data: { createdAt: new Date(createdAt.getTime() + 20_000) },
    });
  }
  await prisma.workspace.update({ where: { id: ws.id }, data: { orderSeq: seq } });
  return ws.id;
}
