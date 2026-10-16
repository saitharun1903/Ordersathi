import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { CatalogueProduct } from "./match";

type Db = PrismaClient | Prisma.TransactionClient;

/** Active catalogue for matching, scoped to one workspace. */
export async function loadMatchCatalogue(db: Db, workspaceId: string): Promise<CatalogueProduct[]> {
  const products = await db.product.findMany({
    where: { workspaceId, archivedAt: null },
    include: { aliases: { select: { normalized: true, customerId: true } }, conversions: { select: { unit: true } } },
    orderBy: { name: "asc" },
  });
  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    brand: p.brand,
    specs: (p.specs ?? {}) as Record<string, string>,
    sellingUnit: p.sellingUnit,
    conversionUnits: p.conversions.map((c) => c.unit),
    aliases: p.aliases,
  }));
}

/** Customer-specific price takes precedence over the standard price. */
export async function effectivePrices(db: Db, workspaceId: string, customerId: string | null, productIds: string[]) {
  const ids = [...new Set(productIds)];
  const [products, customerPrices] = await Promise.all([
    db.product.findMany({ where: { workspaceId, id: { in: ids } }, select: { id: true, pricePaise: true } }),
    customerId
      ? db.customerPrice.findMany({ where: { workspaceId, customerId, productId: { in: ids } }, select: { productId: true, pricePaise: true } })
      : Promise.resolve([]),
  ]);
  const map = new Map<string, { paise: number; source: "CUSTOMER" | "STANDARD"; standardPaise: number }>();
  for (const p of products) map.set(p.id, { paise: p.pricePaise, source: "STANDARD", standardPaise: p.pricePaise });
  for (const cp of customerPrices) {
    const std = map.get(cp.productId);
    if (std) map.set(cp.productId, { paise: cp.pricePaise, source: "CUSTOMER", standardPaise: std.standardPaise });
  }
  return map;
}
