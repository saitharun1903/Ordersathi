import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeText } from "@/lib/normalize";
import { parseRupeesToPaise } from "@/lib/money";
import { REQUEST_UNITS, SELLING_UNITS } from "@/lib/units";
import type { Ctx } from "../context";
import { AppError, notFound } from "../errors";
import { assertCan } from "../permissions";
import { audit } from "../audit";
import { recomputeOrder } from "../orders/recompute";

type Tx = Prisma.TransactionClient;

const money = z
  .union([z.string(), z.number()])
  .transform((v, c) => {
    const p = parseRupeesToPaise(v);
    if (p === null || p <= 0) {
      c.addIssue({ code: "custom", message: "Enter a price in rupees, e.g. 120 or 120.50" });
      return z.NEVER;
    }
    return p;
  });

export const ProductInputSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64).regex(/^[A-Za-z0-9._\-/]+$/, "Use letters, numbers, - _ . /"),
  name: z.string().trim().min(2, "Name is required").max(160),
  category: z.string().trim().min(2, "Category is required").max(60),
  brand: z.string().trim().max(60).nullish().transform((v) => v || null),
  specs: z
    .array(z.object({ key: z.string().trim().max(40), value: z.string().trim().max(80) }))
    .max(12)
    .default([])
    .transform((rows) => Object.fromEntries(rows.filter((r) => r.key && r.value).map((r) => [r.key.toLowerCase(), r.value]))),
  sellingUnit: z.enum(SELLING_UNITS),
  price: money,
  aliases: z
    .array(z.object({ text: z.string().trim().min(1).max(80), language: z.enum(["EN", "TE", "TRANSLIT"]) }))
    .max(30)
    .default([]),
  conversions: z
    .array(
      z.object({
        unit: z.enum(REQUEST_UNITS),
        factor: z.union([z.string(), z.number()]).transform((v, c) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0 || n > 100000) {
            c.addIssue({ code: "custom", message: "Factor must be a positive number" });
            return z.NEVER;
          }
          return String(Math.round(n * 10000) / 10000);
        }),
      }),
    )
    .max(8)
    .default([]),
});

export type ProductInput = z.input<typeof ProductInputSchema>;

function toFieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join(".")] ??= i.message;
  return out;
}

export function parseProductInput(raw: unknown) {
  const r = ProductInputSchema.safeParse(raw);
  if (!r.success) throw new AppError("VALIDATION", "Check the highlighted fields.", toFieldErrors(r.error));
  const d = r.data;
  const dupUnits = d.conversions.map((c) => c.unit);
  if (new Set(dupUnits).size !== dupUnits.length) throw new AppError("VALIDATION", "Each conversion unit can appear only once.", { conversions: "Duplicate unit" });
  if (dupUnits.includes(d.sellingUnit)) throw new AppError("VALIDATION", "A conversion can't use the selling unit itself.", { conversions: "Same as selling unit" });
  return d;
}

async function writeChildren(tx: Tx, workspaceId: string, productId: string, d: ReturnType<typeof parseProductInput>) {
  await tx.productAlias.deleteMany({ where: { productId, customerId: null } });
  const seen = new Set<string>();
  const aliases = d.aliases
    .map((a) => ({ ...a, normalized: normalizeText(a.text) }))
    .filter((a) => a.normalized && !seen.has(a.normalized) && seen.add(a.normalized));
  if (aliases.length) {
    await tx.productAlias.createMany({ data: aliases.map((a) => ({ workspaceId, productId, text: a.text, normalized: a.normalized, language: a.language })) });
  }
  await tx.unitConversion.deleteMany({ where: { productId } });
  if (d.conversions.length) {
    await tx.unitConversion.createMany({ data: d.conversions.map((c) => ({ productId, unit: c.unit, factor: c.factor })) });
  }
}

/** Flag open orders that reference changed products (price changes, archiving). */
export async function refreshOpenOrdersFor(tx: Tx, workspaceId: string, productIds: string[]) {
  const orders = await tx.order.findMany({
    where: { workspaceId, status: { in: ["DRAFT", "NEEDS_CLARIFICATION", "READY_FOR_REVIEW"] }, lines: { some: { productId: { in: productIds } } } },
    select: { id: true },
  });
  for (const o of orders) {
    await recomputeOrder(tx, workspaceId, o.id);
    await tx.order.update({ where: { id: o.id }, data: { version: { increment: 1 } } });
  }
  return orders.length;
}

export async function createProduct(ctx: Ctx, raw: unknown) {
  assertCan(ctx.role, "catalogue.manage");
  const d = parseProductInput(raw);
  return prisma.$transaction(async (tx) => {
    const exists = await tx.product.findUnique({ where: { workspaceId_sku: { workspaceId: ctx.workspaceId, sku: d.sku } } });
    if (exists) throw new AppError("VALIDATION", "A product with this SKU already exists.", { sku: "Already in use" });
    const p = await tx.product.create({
      data: {
        workspaceId: ctx.workspaceId,
        sku: d.sku,
        name: d.name,
        category: d.category,
        brand: d.brand,
        specs: d.specs,
        sellingUnit: d.sellingUnit,
        pricePaise: d.price,
      },
    });
    await writeChildren(tx, ctx.workspaceId, p.id, d);
    await audit(tx, ctx, "product.created", { sku: d.sku });
    return p.id;
  });
}

export async function updateProduct(ctx: Ctx, productId: string, raw: unknown) {
  assertCan(ctx.role, "catalogue.manage");
  const d = parseProductInput(raw);
  return prisma.$transaction(async (tx) => {
    const p = await tx.product.findFirst({ where: { id: productId, workspaceId: ctx.workspaceId } });
    if (!p) throw notFound("Product");
    if (d.sku !== p.sku) {
      const clash = await tx.product.findUnique({ where: { workspaceId_sku: { workspaceId: ctx.workspaceId, sku: d.sku } } });
      if (clash) throw new AppError("VALIDATION", "A product with this SKU already exists.", { sku: "Already in use" });
    }
    await tx.product.update({
      where: { id: p.id },
      data: { sku: d.sku, name: d.name, category: d.category, brand: d.brand, specs: d.specs, sellingUnit: d.sellingUnit, pricePaise: d.price },
    });
    await writeChildren(tx, ctx.workspaceId, p.id, d);
    const affected = await refreshOpenOrdersFor(tx, ctx.workspaceId, [p.id]);
    await audit(tx, ctx, "product.updated", { sku: d.sku, priceChanged: p.pricePaise !== d.price, openOrdersFlagged: affected });
    return { affectedOrders: affected };
  });
}

export async function setProductArchived(ctx: Ctx, productId: string, archived: boolean) {
  assertCan(ctx.role, "catalogue.manage");
  return prisma.$transaction(async (tx) => {
    const r = await tx.product.updateMany({ where: { id: productId, workspaceId: ctx.workspaceId }, data: { archivedAt: archived ? new Date() : null } });
    if (!r.count) throw notFound("Product");
    await refreshOpenOrdersFor(tx, ctx.workspaceId, [productId]);
    await audit(tx, ctx, archived ? "product.archived" : "product.restored", { productId });
  });
}

export async function listProducts(ctx: Ctx, opts: { q?: string; category?: string; archived?: boolean } = {}) {
  assertCan(ctx.role, "catalogue.view");
  const q = opts.q?.trim();
  return prisma.product.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      archivedAt: opts.archived ? { not: null } : null,
      ...(opts.category ? { category: opts.category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { brand: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { aliases: { some: { OR: [{ text: { contains: q, mode: "insensitive" } }, { normalized: { contains: normalizeText(q) } }] } } },
            ],
          }
        : {}),
    },
    include: { aliases: { where: { customerId: null } }, conversions: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

/** Free-text catalogue search used by the review screen's manual picker. */
export async function searchCatalogue(ctx: Ctx, q: string, customerId: string | null) {
  assertCan(ctx.role, "catalogue.view");
  const toks = normalizeText(q).split(" ").filter(Boolean);
  const products = await prisma.product.findMany({
    where: { workspaceId: ctx.workspaceId, archivedAt: null },
    include: { aliases: true, conversions: true },
  });
  const customerPrices = customerId
    ? await prisma.customerPrice.findMany({ where: { workspaceId: ctx.workspaceId, customerId } })
    : [];
  const cp = new Map(customerPrices.map((c) => [c.productId, c.pricePaise]));
  const scored = products
    .map((p) => {
      const hay = normalizeText(
        [p.sku, p.name, p.brand ?? "", p.category, ...Object.values(p.specs as Record<string, string>), ...p.aliases.map((a) => a.text)].join(" "),
      );
      const hayCompact = hay.replace(/\s/g, "");
      let score = 0;
      for (const t of toks) if (hay.includes(t) || hayCompact.includes(t)) score += t.length > 2 ? 2 : 1;
      return { p, score };
    })
    .filter((x) => !toks.length || x.score >= toks.length)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, 25);
  return scored.map(({ p }) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    category: p.category,
    specs: p.specs as Record<string, string>,
    sellingUnit: p.sellingUnit,
    conversions: p.conversions.map((c) => ({ unit: c.unit, factor: c.factor.toString() })),
    pricePaise: cp.get(p.id) ?? p.pricePaise,
    standardPricePaise: p.pricePaise,
    priceSource: (cp.has(p.id) ? "CUSTOMER" : "STANDARD") as "CUSTOMER" | "STANDARD",
    archived: false,
  }));
}

// ───────────────────────── CSV import ─────────────────────────

export const IMPORT_FIELDS = [
  { key: "sku", label: "SKU", required: true },
  { key: "name", label: "Name", required: true },
  { key: "category", label: "Category", required: true },
  { key: "brand", label: "Brand", required: false },
  { key: "specs", label: "Specifications (key=value; …)", required: false },
  { key: "selling_unit", label: "Selling unit", required: true },
  { key: "price", label: "Price (₹)", required: true },
  { key: "aliases_en", label: "English aliases (a|b)", required: false },
  { key: "aliases_te", label: "Telugu aliases (a|b)", required: false },
  { key: "aliases_translit", label: "Transliterated aliases (a|b)", required: false },
  { key: "conversions", label: "Conversions (BOX=10|…)", required: false },
] as const;

export type ImportRow = Partial<Record<(typeof IMPORT_FIELDS)[number]["key"], string>>;

const UNIT_ALIASES: Record<string, string> = { PCS: "PIECE", PC: "PIECE", NOS: "PIECE", PIECES: "PIECE", METER: "METRE", METERS: "METRE", METRES: "METRE", MTR: "METRE", ROLLS: "ROLL", BOXES: "BOX", PKT: "PACKET", PACK: "PACKET", PACKETS: "PACKET", COILS: "COIL", SETS: "SET", KGS: "KG" };
const normUnit = (u: string) => {
  const up = u.trim().toUpperCase();
  return UNIT_ALIASES[up] ?? up;
};
const splitList = (s?: string) => (s ?? "").split("|").map((x) => x.trim()).filter(Boolean);

export function rowToProductInput(row: ImportRow) {
  const specs = (row.specs ?? "")
    .split(";")
    .map((kv) => kv.split("="))
    .filter((kv) => kv.length === 2 && kv[0].trim() && kv[1].trim())
    .map(([key, value]) => ({ key: key.trim(), value: value.trim() }));
  return {
    sku: row.sku ?? "",
    name: row.name ?? "",
    category: row.category ?? "",
    brand: row.brand ?? null,
    specs,
    sellingUnit: normUnit(row.selling_unit ?? ""),
    price: row.price ?? "",
    aliases: [
      ...splitList(row.aliases_en).map((text) => ({ text, language: "EN" as const })),
      ...splitList(row.aliases_te).map((text) => ({ text, language: "TE" as const })),
      ...splitList(row.aliases_translit).map((text) => ({ text, language: "TRANSLIT" as const })),
    ],
    conversions: splitList(row.conversions).map((c) => {
      const [unit, factor] = c.split("=");
      return { unit: normUnit(unit ?? ""), factor: (factor ?? "").trim() };
    }),
  };
}

export type RowResult = { row: number; sku: string; action: "create" | "update" | "error"; errors: string[] };

export async function validateImport(ctx: Ctx, rows: ImportRow[]): Promise<RowResult[]> {
  assertCan(ctx.role, "catalogue.manage");
  if (rows.length > 2000) throw new AppError("VALIDATION", "Import up to 2,000 rows at a time.");
  const existing = new Set((await prisma.product.findMany({ where: { workspaceId: ctx.workspaceId }, select: { sku: true } })).map((p) => p.sku));
  const seen = new Map<string, number>();
  return rows.map((row, i) => {
    const sku = (row.sku ?? "").trim();
    try {
      parseProductInput(rowToProductInput(row));
      if (seen.has(sku)) return { row: i + 1, sku, action: "error" as const, errors: [`Duplicate SKU (also on row ${seen.get(sku)})`] };
      seen.set(sku, i + 1);
      return { row: i + 1, sku, action: existing.has(sku) ? ("update" as const) : ("create" as const), errors: [] };
    } catch (e) {
      const fe = e instanceof AppError ? e.fieldErrors ?? { _: e.message } : { _: "Invalid row" };
      return { row: i + 1, sku, action: "error" as const, errors: Object.entries(fe).map(([k, v]) => (k === "_" ? v : `${k}: ${v}`)) };
    }
  });
}

export async function commitImport(ctx: Ctx, rows: ImportRow[]) {
  const results = await validateImport(ctx, rows);
  const valid = results.filter((r) => r.action !== "error");
  if (!valid.length) throw new AppError("VALIDATION", "No valid rows to import.");
  let created = 0;
  let updated = 0;
  await prisma.$transaction(
    async (tx) => {
      const changed: string[] = [];
      for (const r of valid) {
        const d = parseProductInput(rowToProductInput(rows[r.row - 1]));
        const p = await tx.product.upsert({
          where: { workspaceId_sku: { workspaceId: ctx.workspaceId, sku: d.sku } },
          create: { workspaceId: ctx.workspaceId, sku: d.sku, name: d.name, category: d.category, brand: d.brand, specs: d.specs, sellingUnit: d.sellingUnit, pricePaise: d.price },
          update: { name: d.name, category: d.category, brand: d.brand, specs: d.specs, sellingUnit: d.sellingUnit, pricePaise: d.price, archivedAt: null },
        });
        await writeChildren(tx, ctx.workspaceId, p.id, d);
        if (r.action === "create") created++;
        else {
          updated++;
          changed.push(p.id);
        }
      }
      if (changed.length) await refreshOpenOrdersFor(tx, ctx.workspaceId, changed);
      await audit(tx, ctx, "catalogue.imported", { created, updated, skipped: results.length - valid.length });
    },
    { timeout: 60_000 },
  );
  return { created, updated, skipped: results.length - valid.length };
}

export const CSV_TEMPLATE = [
  "sku,name,category,brand,specs,selling_unit,price,aliases_en,aliases_te,aliases_translit,conversions",
  'ANC-RS-6A-1W,Anchor Roma 6A 1-way switch,Switch,Anchor,rating=6A;type=1-way;colour=White,PIECE,42,light switch,,,BOX=20',
  'POL-FR-2.5-RD,"Polycab FR 2.5 sq mm wire, red, 90 m",Wire,Polycab,size=2.5 sq mm;colour=Red;length=90 m,ROLL,2690,,ఎర్ర వైరు,erra wire,',
  'POL-FLX-3C-1.5,Polycab 3 core 1.5 sq mm flexible cable,Flexible Cable,Polycab,cores=3 core;size=1.5 sq mm,METRE,64,flexible wire,,,COIL=100',
].join("\n");
