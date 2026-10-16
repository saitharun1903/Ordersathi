"use client";
import * as React from "react";
import { Search, PackageSearch } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { searchCatalogueAction } from "@/server/actions/orders";
import type { ProductBrief } from "@/server/orders/view-types";
import { formatPaise } from "@/lib/money";
import { unitLabel } from "@/lib/units";
import { cn } from "@/lib/utils";

export function ProductPicker({
  open,
  onOpenChange,
  initialQuery,
  customerId,
  onPick,
  title = "Choose a catalogue product",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialQuery: string;
  customerId: string | null;
  onPick: (p: ProductBrief) => void;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PickerContent initialQuery={initialQuery} customerId={customerId} onPick={onPick} title={title} />}
    </Dialog>
  );
}

function PickerContent({ initialQuery, customerId, onPick, title }: { initialQuery: string; customerId: string | null; onPick: (p: ProductBrief) => void; title: string }) {
  const [q, setQ] = React.useState(initialQuery);
  const [results, setResults] = React.useState<ProductBrief[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await searchCatalogueAction(q, customerId).catch(() => null);
      if (cancelled) return;
      setLoading(false);
      if (r?.ok) {
        setResults(r.data);
        setError(null);
        setActive(0);
      } else setError(r?.message ?? "Search failed. Try again.");
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, customerId]);

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
      <DialogContent title={title} description="Search by name, SKU, brand, rating or any alias — English or Telugu." className="sm:max-w-xl">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                onPick(results[active]);
              }
            }}
            role="combobox"
            aria-expanded
            aria-controls="picker-results"
            aria-activedescendant={results[active] ? `pick-${results[active].id}` : undefined}
            aria-label="Search catalogue"
            placeholder="e.g. 16A socket, polycab 2.5 red, ఆంకర్ స్విచ్"
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-9 text-sm focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/12"
          />
          {loading && <Spinner className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />}
        </div>
        {error && <p className="mb-2 text-xs text-bad">{error}</p>}
        <ul id="picker-results" ref={listRef} role="listbox" className="-mx-1 max-h-[50dvh] space-y-0.5 overflow-y-auto">
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`pick-${p.id}`}
              data-idx={i}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(p)}
              className={cn("flex cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2", i === active ? "bg-brand-soft" : "hover:bg-sunken")}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <span className="font-mono">{p.sku}</span>
                  {Object.values(p.specs)
                    .slice(0, 3)
                    .map((v) => (
                      <span key={v} className="rounded bg-surface px-1 ring-1 ring-line">
                        {v}
                      </span>
                    ))}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-medium tnum">{formatPaise(p.pricePaise)}</p>
                <p className="text-[11px] text-muted">
                  per {unitLabel(p.sellingUnit, 1)}
                  {p.priceSource === "CUSTOMER" && <span className="ml-1 text-brand">· customer</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {!loading && !results.length && !error && (
          <div className="flex flex-col items-center py-8 text-center text-sm text-muted">
            <PackageSearch className="mb-2 size-6" />
            No products match “{q}”. Products must exist in the catalogue — OrderSathi never invents items.
          </div>
        )}
      </DialogContent>
  );
}
