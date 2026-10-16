"use client";
import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { searchCatalogueAction } from "@/server/actions/orders";
import type { ProductBrief } from "@/server/orders/view-types";
import { formatPaise } from "@/lib/money";
import { unitLabel } from "@/lib/units";
import { cn } from "@/lib/utils";

/** Accessible catalogue search combobox. Shows the selected product as a chip. */
export function ProductPicker({
  id,
  value,
  onChange,
  customerId,
  invalid,
  describedBy,
}: {
  id: string;
  value: ProductBrief | null;
  onChange: (p: ProductBrief | null) => void;
  customerId: string | null;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<ProductBrief[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const reqId = React.useRef(0);
  const listId = `${id}-list`;

  React.useEffect(() => {
    if (!open) return;
    const my = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchCatalogueAction(q, customerId);
        if (my !== reqId.current) return;
        if (r.ok) {
          setItems(r.data);
          setError(null);
        } else setError(r.message);
        setActive(0);
      } catch {
        if (my === reqId.current) setError("Search failed. Try again.");
      } finally {
        if (my === reqId.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q, open, customerId]);

  function choose(p: ProductBrief) {
    onChange(p);
    setOpen(false);
    setQ("");
  }

  if (value) {
    return (
      <div
        className={cn(
          "flex min-h-9 items-center justify-between gap-2 rounded-lg border bg-surface-2 px-3 py-1.5",
          invalid ? "border-bad" : "border-line-strong",
        )}
      >
        <div className="min-w-0 text-[13px]">
          <div className="truncate font-medium text-ink">{value.name}</div>
          <div className="truncate text-xs text-muted">
            <span className="font-mono">{value.sku}</span> · {formatPaise(value.standardPricePaise)} / {unitLabel(value.sellingUnit, 1)}
          </div>
        </div>
        <button
          type="button"
          id={id}
          onClick={() => {
            onChange(null);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="shrink-0 rounded-md p-1 text-muted hover:bg-sunken hover:text-ink"
          aria-label={`Change product (selected: ${value.name})`}
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const activeItem = items[active];
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && activeItem ? `${listId}-${activeItem.id}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={q}
        placeholder="Search by name, SKU or alias"
        autoComplete="off"
        className="pl-9 pr-8"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            if (open && activeItem) {
              e.preventDefault();
              choose(activeItem);
            }
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {loading && <Spinner className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Products"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[var(--shadow-pop)]"
        >
          {error ? (
            <li className="px-2 py-2 text-[13px] text-bad">{error}</li>
          ) : items.length === 0 ? (
            <li className="px-2 py-2 text-[13px] text-muted">{loading ? "Searching…" : "No products found"}</li>
          ) : (
            items.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex cursor-pointer items-start justify-between gap-3 rounded-md px-2 py-1.5 text-[13px]", i === active && "bg-sunken")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-ink">{p.name}</span>
                  <span className="block truncate font-mono text-[11px] text-muted">{p.sku}</span>
                </span>
                <span className="tnum shrink-0 text-xs text-ink-2">{formatPaise(p.standardPricePaise)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
