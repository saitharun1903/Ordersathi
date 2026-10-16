import { DEMO_PRODUCTS } from "@/server/demo/catalogue-data";
import type { CatalogueProduct } from "@/server/orders/match";
import { normalizeText } from "@/lib/normalize";

export const catalogue: CatalogueProduct[] = DEMO_PRODUCTS.map((p) => ({
  id: p.sku,
  sku: p.sku,
  name: p.name,
  category: p.category,
  brand: p.brand,
  specs: p.specs,
  sellingUnit: p.sellingUnit,
  conversionUnits: Object.keys(p.conversions ?? {}),
  aliases: (p.aliases ?? []).map((a) => ({ normalized: normalizeText(a.text), customerId: null })),
}));
