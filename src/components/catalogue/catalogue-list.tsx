"use client";
import * as React from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPaise, formatQty } from "@/lib/money";
import { UNIT_SHORT, unitLabel } from "@/lib/units";
import { cn } from "@/lib/utils";
import { ProductSheet } from "./product-form";
import type { ProductRow } from "./types";

function SpecChips({ specs, max = 3 }: { specs: Record<string, string>; max?: number }) {
  const entries = Object.entries(specs);
  if (!entries.length) return <span className="text-faint">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {entries.slice(0, max).map(([k, v]) => (
        <span key={k} title={`${k}: ${v}`} className="inline-flex items-center rounded border border-line bg-surface-2 px-1.5 py-px text-[11px] leading-4 text-ink-2">
          {v}
        </span>
      ))}
      {entries.length > max && <span className="px-0.5 text-[11px] leading-5 text-faint">+{entries.length - max}</span>}
    </span>
  );
}

function AliasSummary({ aliases }: { aliases: ProductRow["aliases"] }) {
  if (!aliases.length) return <span className="text-faint">—</span>;
  const n = (l: string) => aliases.filter((a) => a.language === l).length;
  const parts = [
    { k: "EN", n: n("EN") },
    { k: "TE", n: n("TE") },
    { k: "TL", n: n("TRANSLIT"), title: "Transliterated" },
  ].filter((p) => p.n > 0);
  const preview = aliases.slice(0, 4).map((a) => a.text).join(", ");
  return (
    <span className="inline-flex items-center gap-1.5" title={preview}>
      <span className="tnum font-medium text-ink">{aliases.length}</span>
      <span className="flex gap-1">
        {parts.map((p) => (
          <span key={p.k} className="rounded bg-sunken px-1 text-[10px] font-medium leading-4 tracking-wide text-muted" title={p.title}>
            {p.k}
            {p.n > 1 ? <span className="tnum"> {p.n}</span> : null}
          </span>
        ))}
      </span>
    </span>
  );
}

export function conversionText(c: { unit: string; factor: string }, sellingUnit: string) {
  return `1 ${unitLabel(c.unit, 1)} = ${formatQty(c.factor)} ${UNIT_SHORT[sellingUnit] ?? unitLabel(sellingUnit)}`;
}

function Conversions({ p }: { p: ProductRow }) {
  if (!p.conversions.length) return <span className="text-faint">—</span>;
  return (
    <span className="flex flex-col gap-0.5">
      {p.conversions.map((c) => (
        <span key={c.unit} className="tnum whitespace-nowrap">
          {conversionText(c, p.sellingUnit)}
        </span>
      ))}
    </span>
  );
}

/** Catalogue table (desktop) / cards (mobile) with an edit drawer. */
export function CatalogueList({ products, categories, canManage }: { products: ProductRow[]; categories: string[]; canManage: boolean }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const selected = products.find((p) => p.id === openId) ?? null;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-[var(--shadow-card)] md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left text-xs font-medium text-muted">
              <th scope="col" className="px-4 py-2.5 font-medium">SKU</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Product</th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">Category</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Specs</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Unit</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Price</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Aliases</th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium xl:table-cell">Conversions</th>
              <th scope="col" className="w-8 px-2 py-2.5"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                onClick={() => setOpenId(p.id)}
                className={cn("group cursor-pointer border-b border-line align-top last:border-b-0 hover:bg-surface-2", p.archived && "text-muted")}
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink-2">{p.sku}</td>
                <td className="min-w-56 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenId(p.id);
                    }}
                    className="rounded-sm text-left font-medium text-ink hover:underline hover:underline-offset-2"
                  >
                    {p.name}
                  </button>
                  {p.brand && <div className="text-xs text-muted">{p.brand}</div>}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2.5 text-ink-2 lg:table-cell">{p.category}</td>
                <td className="px-3 py-2.5">
                  <SpecChips specs={p.specs} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{unitLabel(p.sellingUnit, 1)}</td>
                <td className="tnum whitespace-nowrap px-3 py-2.5 text-right font-medium text-ink">{formatPaise(p.pricePaise)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <AliasSummary aliases={p.aliases} />
                </td>
                <td className="hidden px-3 py-2.5 text-xs text-ink-2 xl:table-cell">
                  <Conversions p={p} />
                </td>
                <td className="px-2 py-2.5 text-faint">
                  <ChevronRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {products.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpenId(p.id)}
              className="flex w-full flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-left shadow-[var(--shadow-card)] active:bg-surface-2"
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{p.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="font-mono">{p.sku}</span>
                    {p.brand && <span>· {p.brand}</span>}
                    <span>· {p.category}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="tnum text-sm font-semibold text-ink">{formatPaise(p.pricePaise)}</div>
                  <div className="text-[11px] text-muted">per {unitLabel(p.sellingUnit, 1)}</div>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-ink-2">
                <SpecChips specs={p.specs} />
                <span className="flex items-center gap-3">
                  {p.conversions[0] && <span className="tnum">{conversionText(p.conversions[0], p.sellingUnit)}</span>}
                  <AliasSummary aliases={p.aliases} />
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        {selected && <ProductSheet key={selected.id} product={selected} categories={categories} canManage={canManage} onDone={() => setOpenId(null)} />}
      </Dialog>
    </>
  );
}

/** "Add product" button that opens an empty product drawer. Managers only. */
export function AddProductButton({ categories, variant = "primary" }: { categories: string[]; variant?: "primary" | "secondary" }) {
  const [open, setOpen] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant={variant}
        size="sm"
        onClick={() => {
          setNonce((n) => n + 1);
          setOpen(true);
        }}
      >
        <Plus /> Add product
      </Button>
      {open && <ProductSheet key={nonce} categories={categories} canManage onDone={() => setOpen(false)} />}
    </Dialog>
  );
}
