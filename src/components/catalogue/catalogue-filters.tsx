"use client";
import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** GET-form search + category filter + Active/Archived toggle. Works without JS too. */
export function CatalogueFilters({ q, category, archived, categories }: { q: string; category: string; archived: boolean; categories: string[] }) {
  const href = (arch: boolean) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (arch) sp.set("archived", "1");
    const s = sp.toString();
    return `/catalogue${s ? `?${s}` : ""}`;
  };
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <form method="get" action="/catalogue" role="search" className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <label htmlFor="cat-q" className="sr-only">
            Search catalogue
          </label>
          <Input id="cat-q" name="q" type="search" defaultValue={q} placeholder="Search SKU, name, brand or alias" className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="cat-category" className="sr-only">
            Category
          </label>
          <Select
            id="cat-category"
            name="category"
            defaultValue={category}
            className="min-w-0 flex-1 sm:w-48 sm:flex-none"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {archived && <input type="hidden" name="archived" value="1" />}
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </div>
      </form>
      <nav aria-label="Product status" className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg bg-sunken p-1 sm:self-auto">
        {[
          { label: "Active", arch: false },
          { label: "Archived", arch: true },
        ].map((t) => (
          <Link
            key={t.label}
            href={href(t.arch)}
            aria-current={archived === t.arch ? "page" : undefined}
            className={cn(
              "inline-flex h-7 items-center rounded-md px-3 text-[13px] font-medium text-muted transition-colors hover:text-ink",
              archived === t.arch && "bg-surface text-ink shadow-[var(--shadow-card)]",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
