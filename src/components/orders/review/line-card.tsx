"use client";
import * as React from "react";
import { AlertTriangle, ArrowRight, Check, CircleSlash, Minus, Plus, Quote, Search, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPaise, formatQty } from "@/lib/money";
import { REQUEST_UNITS, unitLabel, UNIT_SHORT } from "@/lib/units";
import { LINE_STATUS } from "@/components/ui/status";
import { Button } from "@/components/ui/button";
import type { LineView, ProductBrief } from "@/server/orders/view-types";

import type { RequestUnit } from "@/lib/units";
export type LinePatch = { productId?: string; quantity?: string | null; unit?: RequestUnit | null; acceptPrice?: true };

const SPEC_PRIORITY = ["rating", "type", "size", "wattage", "colour", "poles", "pins", "sweep", "modules", "cores", "length", "diameter", "gauge", "cap"];

function specChips(p: ProductBrief) {
  return Object.entries(p.specs)
    .sort(([a], [b]) => (SPEC_PRIORITY.indexOf(a) + 1 || 99) - (SPEC_PRIORITY.indexOf(b) + 1 || 99))
    .slice(0, 4)
    .map(([, v]) => v);
}

export function LineCard({
  line,
  index,
  editable,
  busy,
  active,
  onActivate,
  onPatch,
  onRemove,
  onSearch,
}: {
  line: LineView;
  index: number;
  editable: boolean;
  busy: boolean;
  active: boolean;
  onActivate: (id: string | null) => void;
  onPatch: (patch: LinePatch) => Promise<unknown>;
  onRemove: () => void;
  onSearch: () => void;
}) {
  const s = LINE_STATUS[line.status];
  const p = line.product;
  const [qty, setQty] = React.useState(line.quantity ? formatQtyInput(line.quantity) : "");
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const qtyRef = React.useRef<HTMLInputElement>(null);
  const [syncedQty, setSyncedQty] = React.useState(line.quantity);
  if (syncedQty !== line.quantity) {
    setSyncedQty(line.quantity);
    setQty(line.quantity ? formatQtyInput(line.quantity) : "");
  }

  const commitQty = (value: string) => {
    const v = value.trim();
    const current = line.quantity ? formatQtyInput(line.quantity) : "";
    if (v === current) return;
    if (v === "") return void onPatch({ quantity: null });
    if (!/^\d{1,7}(\.\d{1,3})?$/.test(v) || Number(v) <= 0) {
      setQty(current);
      return;
    }
    void onPatch({ quantity: v });
  };

  const unitOptions = React.useMemo(() => {
    const preferred = p ? [p.sellingUnit, ...p.conversions.map((c) => c.unit), ...(p.sellingUnit === "PIECE" ? ["DOZEN"] : [])] : [];
    const rest = REQUEST_UNITS.filter((u) => !preferred.includes(u));
    return { preferred, rest };
  }, [p]);

  const converted = p && line.sellQuantity && line.unit && line.unit !== p.sellingUnit;
  const blocking = line.issues.filter((i) => i.blocking);
  const candidateIssue = line.issues.find((i) => ["AMBIGUOUS", "SPEC_UNAVAILABLE", "AI_SUGGESTED", "NO_MATCH", "PRODUCT_ARCHIVED"].includes(i.code));

  return (
    <li
      id={`line-${line.id}`}
      data-status={line.status}
      onMouseEnter={() => onActivate(line.id)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(line.id)}
      className={cn(
        "group relative scroll-mt-28 overflow-hidden rounded-xl border bg-surface transition-[box-shadow,border-color] duration-150",
        active ? "border-line-strong shadow-[var(--shadow-pop)]" : "border-line shadow-[var(--shadow-card)]",
        busy && "opacity-70",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", s.rail)} aria-hidden />
      <div className="py-3 pl-4 pr-3 sm:pl-5 sm:pr-4">
        {/* Original wording + status */}
        <div className="flex items-start justify-between gap-3">
          <p className="flex min-w-0 items-start gap-1.5 text-[13px] text-muted">
            <span className="mt-px shrink-0 font-mono text-[11px] text-faint tnum">{String(index + 1).padStart(2, "0")}</span>
            <Quote className="mt-0.5 size-3 shrink-0 text-faint" aria-hidden />
            <span className="min-w-0 break-words italic text-ink-2" lang={/[ఀ-౿]/.test(line.originalText) ? "te" : undefined}>
              {line.originalText}
            </span>
          </p>
          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", s.soft, s.text)}>
            {line.status === "CONFIRMED" ? <Check className="size-3" /> : line.status === "NEEDS_REVIEW" ? <TriangleAlert className="size-3" /> : <CircleSlash className="size-3" />}
            {s.label}
          </span>
        </div>

        <div className="mt-2.5 grid gap-3 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-center">
          {/* Product */}
          <div className="min-w-0">
            {p ? (
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold leading-snug text-ink">{p.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{p.sku}</span>
                    {p.brand && <span className="text-[12px] font-medium text-ink-2">{p.brand}</span>}
                    {specChips(p).map((v) => (
                      <span key={v} className="rounded border border-line px-1.5 py-px text-[11px] text-muted">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
                {editable && (
                  <Button size="xs" variant="ghost" onClick={onSearch} disabled={busy} className="ml-auto shrink-0 text-muted" aria-label={`Change product for line ${index + 1}`}>
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-[14px] font-medium text-muted">{line.candidates.length ? "Choose the exact product" : "No catalogue product selected"}</p>
            )}
          </div>

          {/* Quantity, unit, price */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap 2xl:justify-end">
            <div className="flex items-center gap-1.5">
              <div className={cn("flex h-8 items-center rounded-lg border bg-surface", line.issues.some((i) => i.code === "QUANTITY_MISSING") ? "border-bad" : "border-line-strong")}>
                {editable && (
                  <button type="button" className="flex h-full w-7 items-center justify-center text-muted hover:text-ink disabled:opacity-40" aria-label="Decrease quantity" disabled={busy || !line.quantity || Number(line.quantity) <= 1} onClick={() => onPatch({ quantity: String(Math.max(1, Math.ceil(Number(line.quantity)) - 1)) })}>
                    <Minus className="size-3.5" />
                  </button>
                )}
                <input
                  ref={qtyRef}
                  id={`qty-${line.id}`}
                  inputMode="decimal"
                  value={qty}
                  disabled={!editable || busy}
                  onChange={(e) => setQty(e.target.value)}
                  onBlur={(e) => commitQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setQty(line.quantity ? formatQtyInput(line.quantity) : "");
                  }}
                  placeholder="Qty"
                  aria-label={`Quantity for line ${index + 1}`}
                  className="h-full w-14 bg-transparent text-center text-[13px] font-semibold tnum outline-none placeholder:font-normal placeholder:text-bad/70 disabled:text-ink"
                />
                {editable && (
                  <button type="button" className="flex h-full w-7 items-center justify-center text-muted hover:text-ink disabled:opacity-40" aria-label="Increase quantity" disabled={busy} onClick={() => onPatch({ quantity: String(Math.floor(Number(line.quantity ?? 0)) + 1) })}>
                    <Plus className="size-3.5" />
                  </button>
                )}
              </div>
              <select
                value={line.unit ?? ""}
                disabled={!editable || busy}
                onChange={(e) => onPatch({ unit: (e.target.value || null) as RequestUnit | null })}
                aria-label={`Unit for line ${index + 1}`}
                className={cn(
                  "h-8 rounded-lg border bg-surface px-2 text-[13px] text-ink outline-none focus:border-brand disabled:opacity-100",
                  line.issues.some((i) => i.code.startsWith("UNIT")) ? "border-warn-strong" : "border-line-strong",
                )}
              >
                <option value="">{line.rawUnit && !line.unit ? `“${line.rawUnit}”?` : p ? `${unitLabel(p.sellingUnit)} (default)` : "unit…"}</option>
                {unitOptions.preferred.length > 0 && (
                  <optgroup label="For this product">
                    {unitOptions.preferred.map((u) => (
                      <option key={u} value={u}>
                        {unitLabel(u)}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={unitOptions.preferred.length ? "Other units" : "Units"}>
                  {unitOptions.rest.map((u) => (
                    <option key={u} value={u}>
                      {unitLabel(u)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="ml-auto min-w-[5.5rem] text-right 2xl:ml-0">
              <p className="text-[12px] text-muted tnum">
                {line.unitPricePaise !== null && p ? (
                  <>
                    {formatPaise(line.unitPricePaise)}
                    <span className="text-faint">/{UNIT_SHORT[p.sellingUnit]}</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              {line.priceSource === "CUSTOMER" && <p className="text-[10px] font-medium uppercase tracking-wide text-brand">Customer price</p>}
            </div>
            <div className="min-w-[6rem] text-right">
              <p className={cn("text-[15px] font-semibold tnum", line.lineTotalPaise === null && "text-faint")}>{line.lineTotalPaise === null ? "—" : formatPaise(line.lineTotalPaise)}</p>
              {converted && (
                <p className="text-[11px] text-muted tnum">
                  = {formatQty(line.sellQuantity)} {unitLabel(p!.sellingUnit, Number(line.sellQuantity))}
                </p>
              )}
            </div>
            {editable && (
              <div>
                {confirmRemove ? (
                  <span className="flex items-center gap-1">
                    <Button size="xs" variant="danger" onClick={onRemove} disabled={busy}>
                      Remove
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setConfirmRemove(false)}>
                      Keep
                    </Button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmRemove(true)} className="rounded-md p-1.5 text-faint opacity-60 hover:bg-bad-soft hover:text-bad group-hover:opacity-100" aria-label={`Remove line ${index + 1}`}>
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Issues with one-click resolutions */}
        {blocking.length > 0 && (
          <div className={cn("mt-3 rounded-lg border px-3 py-2.5", line.status === "NEEDS_REVIEW" ? "border-warn-line bg-warn-soft/60" : "border-bad-line bg-bad-soft/60")}>
            <ul className="space-y-1">
              {blocking.map((issue, i) => (
                <li key={i} className={cn("flex items-start gap-2 text-[13px]", line.status === "NEEDS_REVIEW" ? "text-warn" : "text-bad")}>
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span className="font-medium">{issue.message}</span>
                </li>
              ))}
            </ul>
            {editable && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {candidateIssue &&
                  line.candidates.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={busy}
                      onClick={() => onPatch({ productId: c.id })}
                      className="group/c flex max-w-full items-center gap-2 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-left text-[12px] shadow-[var(--shadow-card)] transition-colors hover:border-brand hover:bg-brand-soft disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{c.reason && c.reason !== "Closest available" ? c.reason : c.name}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {c.reason && c.reason !== "Closest available" ? `${c.name} · ` : ""}
                          {formatPaise(c.pricePaise)}/{UNIT_SHORT[c.sellingUnit]}
                        </span>
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-faint group-hover/c:text-brand" />
                    </button>
                  ))}
                {(candidateIssue || !p) && (
                  <Button size="sm" variant="secondary" onClick={onSearch} disabled={busy}>
                    <Search /> Search catalogue
                  </Button>
                )}
                {line.issues.map((issue) => {
                  const d = (issue.data ?? {}) as Record<string, unknown>;
                  switch (issue.code) {
                    case "QUANTITY_MISSING":
                      return (
                        <Button key="q" size="sm" variant="secondary" onClick={() => qtyRef.current?.focus()}>
                          Enter quantity
                        </Button>
                      );
                    case "UNIT_NOT_STATED":
                    case "UNIT_CONVERSION_UNAVAILABLE":
                      return (
                        <Button key="u" size="sm" variant="secondary" disabled={busy} onClick={() => onPatch({ unit: String(d.sellingUnit) as RequestUnit })}>
                          Use {unitLabel(String(d.sellingUnit))}
                          {issue.code === "UNIT_NOT_STATED" && line.quantity ? ` (${formatQty(line.quantity)})` : ""}
                        </Button>
                      );
                    case "PARTIAL_PACK": {
                      const u = String(d.sellingUnit);
                      const opts = [Number(d.lower), Number(d.upper)].filter((n) => n > 0);
                      return opts.map((n) => (
                        <Button key={`pp${n}`} size="sm" variant="secondary" disabled={busy} onClick={() => onPatch({ quantity: String(n), unit: u as RequestUnit })}>
                          Make it {n} {unitLabel(u, n)}
                        </Button>
                      ));
                    }
                    case "PRICE_CHANGED":
                      return (
                        <Button key="pc" size="sm" variant="warn" disabled={busy} onClick={() => onPatch({ acceptPrice: true })}>
                          Use current price {formatPaise(Number(d.to))}
                        </Button>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function formatQtyInput(q: string) {
  return String(Number(q));
}
