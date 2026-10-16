import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileUp, PackageOpen, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePageContext } from "@/server/context";
import { can } from "@/server/permissions";
import { listProducts } from "@/server/catalogue/service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CatalogueFilters } from "@/components/catalogue/catalogue-filters";
import { AddProductButton, CatalogueList } from "@/components/catalogue/catalogue-list";
import type { AliasLang, ProductRow } from "@/components/catalogue/types";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Catalogue" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CataloguePage(props: PageProps<"/catalogue">) {
  const ctx = await requirePageContext();
  const sp = await props.searchParams;
  const q = first(sp.q).trim();
  const category = first(sp.category).trim();
  const archived = first(sp.archived) === "1";
  const canManage = can(ctx.role, "catalogue.manage");

  const [products, categoryRows, activeCount] = await Promise.all([
    listProducts(ctx, { q: q || undefined, category: category || undefined, archived }),
    prisma.product.findMany({ where: { workspaceId: ctx.workspaceId }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    prisma.product.count({ where: { workspaceId: ctx.workspaceId, archivedAt: null } }),
  ]);
  const categories = categoryRows.map((c) => c.category);

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    brand: p.brand,
    specs: (p.specs ?? {}) as Record<string, string>,
    sellingUnit: p.sellingUnit,
    pricePaise: p.pricePaise,
    archived: !!p.archivedAt,
    aliases: p.aliases.map((a) => ({ id: a.id, text: a.text, language: a.language as AliasLang })),
    conversions: p.conversions.map((c) => ({ unit: c.unit, factor: c.factor.toString() })),
  }));

  const filtered = !!(q || category);
  const catalogueEmpty = activeCount === 0 && categories.length === 0;

  return (
    <>
      <PageHeader
        title="Catalogue"
        description={
          catalogueEmpty
            ? "Products OrderSathi can match customer messages to."
            : `${pluralize(activeCount, "active product")} · ${pluralize(categories.length, "category", "categories")}`
        }
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <a href="/api/catalogue/template" download>
                <Download /> Download template
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/catalogue/import">
                <FileUp /> Import CSV
              </Link>
            </Button>
            {canManage && <AddProductButton categories={categories} />}
          </>
        }
      />

      {catalogueEmpty ? (
        <Card>
          <EmptyState
            icon={<PackageOpen />}
            title="Your catalogue is empty"
            description="Import your price list as a CSV, or add products one by one. OrderSathi matches customer messages only against products in your catalogue."
            action={
              canManage ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild variant="primary" size="sm">
                    <Link href="/catalogue/import">
                      <FileUp /> Import CSV
                    </Link>
                  </Button>
                  <AddProductButton categories={categories} variant="secondary" />
                </div>
              ) : (
                <p className="text-[13px] text-muted">Ask a manager to set up the catalogue.</p>
              )
            }
          />
        </Card>
      ) : (
        <>
          <CatalogueFilters q={q} category={category} archived={archived} categories={categories} />
          {filtered && rows.length > 0 && (
            <p className="mb-2 text-[13px] text-muted" aria-live="polite">
              {pluralize(rows.length, "result")}
              {q && (
                <>
                  {" "}
                  for “<span className="text-ink">{q}</span>”
                </>
              )}
              {category && <> in {category}</>}
              {" · "}
              <Link href={archived ? "/catalogue?archived=1" : "/catalogue"} className="text-brand hover:underline">
                Clear filters
              </Link>
            </p>
          )}
          {rows.length === 0 ? (
            <Card>
              {filtered ? (
                <EmptyState
                  icon={<SearchX />}
                  title="No products match"
                  description={`Nothing ${archived ? "archived " : ""}matches${q ? ` “${q}”` : ""}${category ? ` in ${category}` : ""}. Try a different SKU, name or alias.`}
                  action={
                    <Button asChild variant="secondary" size="sm">
                      <Link href={archived ? "/catalogue?archived=1" : "/catalogue"}>Clear filters</Link>
                    </Button>
                  }
                />
              ) : archived ? (
                <EmptyState icon={<PackageOpen />} title="No archived products" description="Products you archive will appear here. You can restore them at any time." />
              ) : (
                <EmptyState
                  icon={<PackageOpen />}
                  title="No active products"
                  description="All products are archived. Restore one from the Archived tab, or add a new product."
                  action={canManage ? <AddProductButton categories={categories} variant="secondary" /> : undefined}
                />
              )}
            </Card>
          ) : (
            <CatalogueList products={rows} categories={categories} canManage={canManage} />
          )}
        </>
      )}
    </>
  );
}
