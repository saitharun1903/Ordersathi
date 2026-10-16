import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeText } from "@/lib/normalize";
import { parseRupeesToPaise } from "@/lib/money";
import type { Ctx } from "../context";
import { AppError, notFound } from "../errors";
import { assertCan } from "../permissions";
import { audit } from "../audit";
import { refreshOpenOrdersFor } from "../catalogue/service";

export const CustomerInputSchema = z.object({
  name: z.string().trim().min(2, "Shop or business name is required").max(120),
  contactName: z.string().trim().max(80).nullish().transform((v) => v || null),
  phone: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => v || null)
    .refine((v) => !v || /^[+\d][\d\s-]{6,18}$/.test(v), "Enter a valid phone number"),
  city: z.string().trim().max(80).nullish().transform((v) => v || null),
  preferredLanguage: z.enum(["AUTO", "EN", "TE"]).default("AUTO"),
  notes: z.string().trim().max(1000).nullish().transform((v) => v || null),
});

function parse<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const r = schema.safeParse(raw);
  if (!r.success) {
    const fe: Record<string, string> = {};
    for (const i of r.error.issues) fe[i.path.join(".")] ??= i.message;
    throw new AppError("VALIDATION", "Check the highlighted fields.", fe);
  }
  return r.data;
}

export async function listCustomers(ctx: Ctx, q?: string) {
  assertCan(ctx.role, "customer.view");
  const customers = await prisma.customer.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      archivedAt: null,
      ...(q?.trim()
        ? { OR: [{ name: { contains: q.trim(), mode: "insensitive" } }, { contactName: { contains: q.trim(), mode: "insensitive" } }, { phone: { contains: q.trim() } }, { city: { contains: q.trim(), mode: "insensitive" } }] }
        : {}),
    },
    include: { _count: { select: { orders: true, prices: true } } },
    orderBy: { name: "asc" },
  });
  const last = await prisma.order.groupBy({
    by: ["customerId"],
    where: { workspaceId: ctx.workspaceId, customerId: { in: customers.map((c) => c.id) } },
    _max: { createdAt: true },
  });
  const approved = await prisma.order.groupBy({
    by: ["customerId"],
    where: { workspaceId: ctx.workspaceId, status: "APPROVED", customerId: { in: customers.map((c) => c.id) } },
    _sum: { totalPaise: true },
  });
  return customers.map((c) => ({
    ...c,
    lastOrderAt: last.find((l) => l.customerId === c.id)?._max.createdAt ?? null,
    approvedValuePaise: approved.find((a) => a.customerId === c.id)?._sum.totalPaise ?? 0,
  }));
}

export async function createCustomer(ctx: Ctx, raw: unknown) {
  assertCan(ctx.role, "customer.manage");
  const d = parse(CustomerInputSchema, raw);
  return prisma.$transaction(async (tx) => {
    const c = await tx.customer.create({ data: { ...d, workspaceId: ctx.workspaceId } });
    await audit(tx, ctx, "customer.created", { customerId: c.id });
    return c.id;
  });
}

export async function updateCustomer(ctx: Ctx, id: string, raw: unknown) {
  assertCan(ctx.role, "customer.manage");
  const d = parse(CustomerInputSchema, raw);
  const r = await prisma.customer.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: d });
  if (!r.count) throw notFound("Customer");
}

export async function archiveCustomer(ctx: Ctx, id: string) {
  assertCan(ctx.role, "customer.manage");
  const r = await prisma.customer.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: { archivedAt: new Date() } });
  if (!r.count) throw notFound("Customer");
}

export async function getCustomerDetail(ctx: Ctx, id: string) {
  assertCan(ctx.role, "customer.view");
  const c = await prisma.customer.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      prices: { include: { product: { select: { id: true, sku: true, name: true, pricePaise: true, sellingUnit: true, archivedAt: true } } }, orderBy: { updatedAt: "desc" } },
      aliases: { include: { product: { select: { id: true, sku: true, name: true } } }, orderBy: { createdAt: "desc" } },
      orders: { orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { lines: true } } } },
    },
  });
  if (!c) throw notFound("Customer");
  return c;
}

const PriceSchema = z.object({ productId: z.string().max(40), price: z.union([z.string(), z.number()]) });

export async function setCustomerPrice(ctx: Ctx, customerId: string, raw: unknown) {
  assertCan(ctx.role, "customer.manage");
  const d = parse(PriceSchema, raw);
  const paise = parseRupeesToPaise(d.price);
  if (paise === null || paise <= 0) throw new AppError("VALIDATION", "Enter a valid price.", { price: "Invalid price" });
  return prisma.$transaction(async (tx) => {
    const [c, p] = await Promise.all([
      tx.customer.findFirst({ where: { id: customerId, workspaceId: ctx.workspaceId } }),
      tx.product.findFirst({ where: { id: d.productId, workspaceId: ctx.workspaceId } }),
    ]);
    if (!c || !p) throw notFound("Customer or product");
    await tx.customerPrice.upsert({
      where: { customerId_productId: { customerId, productId: p.id } },
      create: { workspaceId: ctx.workspaceId, customerId, productId: p.id, pricePaise: paise },
      update: { pricePaise: paise },
    });
    await refreshOpenOrdersFor(tx, ctx.workspaceId, [p.id]);
    await audit(tx, ctx, "customer.price_set", { customerId, sku: p.sku });
  }, { timeout: 30_000, maxWait: 10_000 });
}

export async function removeCustomerPrice(ctx: Ctx, customerId: string, productId: string) {
  assertCan(ctx.role, "customer.manage");
  return prisma.$transaction(async (tx) => {
    const r = await tx.customerPrice.deleteMany({ where: { workspaceId: ctx.workspaceId, customerId, productId } });
    if (!r.count) throw notFound("Price");
    await refreshOpenOrdersFor(tx, ctx.workspaceId, [productId]);
    await audit(tx, ctx, "customer.price_removed", { customerId, productId });
  }, { timeout: 30_000, maxWait: 10_000 });
}

const AliasSchema = z.object({ productId: z.string().max(40), text: z.string().trim().min(2).max(80), language: z.enum(["EN", "TE", "TRANSLIT"]) });

export async function addCustomerAlias(ctx: Ctx, customerId: string, raw: unknown) {
  assertCan(ctx.role, "customer.manage");
  const d = parse(AliasSchema, raw);
  const [c, p] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, workspaceId: ctx.workspaceId } }),
    prisma.product.findFirst({ where: { id: d.productId, workspaceId: ctx.workspaceId } }),
  ]);
  if (!c || !p) throw notFound("Customer or product");
  await prisma.productAlias.create({
    data: { workspaceId: ctx.workspaceId, customerId, productId: p.id, text: d.text, normalized: normalizeText(d.text), language: d.language },
  });
}

export async function removeCustomerAlias(ctx: Ctx, aliasId: string) {
  assertCan(ctx.role, "customer.manage");
  const r = await prisma.productAlias.deleteMany({ where: { id: aliasId, workspaceId: ctx.workspaceId, customerId: { not: null } } });
  if (!r.count) throw notFound("Alias");
}
