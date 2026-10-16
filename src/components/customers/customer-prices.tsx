"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IndianRupee, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/field";
import { Pill } from "@/components/ui/status";
import { removeCustomerPriceAction, setCustomerPriceAction } from "@/server/actions/catalogue";
import type { ProductBrief } from "@/server/orders/view-types";
import { formatPaise, paiseToRupeeInput } from "@/lib/money";
import { unitLabel } from "@/lib/units";
import { cn } from "@/lib/utils";
import { ConfirmAction } from "@/components/catalogue/confirm-action";
import { ProductPicker } from "./product-picker";

export type CustomerPriceRow = {
  productId: string;
  sku: string;
  name: string;
  sellingUnit: string;
  standardPricePaise: number;
  pricePaise: number;
  archived: boolean;
};

function Diff({ standard, price }: { standard: number; price: number }) {
  if (!standard) return <span className="text-faint">—</span>;
  const pct = ((price - standard) / standard) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return <span className="tnum text-muted">0%</span>;
  return (
    <span className={cn("tnum font-medium", rounded < 0 ? "text-ok" : "text-warn")}>
      {rounded > 0 ? "+" : "−"}
      {Math.abs(rounded).toFixed(1)}%
    </span>
  );
}

export function CustomerPrices({ customerId, prices, canManage }: { customerId: string; prices: CustomerPriceRow[]; canManage: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [product, setProduct] = React.useState<ProductBrief | null>(null);
  const [price, setPrice] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const priceRef = React.useRef<HTMLInputElement>(null);

  function startEdit(p: CustomerPriceRow) {
    setAdding(true);
    setErrors({});
    setProduct({
      id: p.productId,
      sku: p.sku,
      name: p.name,
      brand: null,
      category: "",
      specs: {},
      sellingUnit: p.sellingUnit,
      conversions: [],
      pricePaise: p.pricePaise,
      standardPricePaise: p.standardPricePaise,
      priceSource: "CUSTOMER",
      archived: p.archived,
    });
    setPrice(paiseToRupeeInput(p.pricePaise));
    requestAnimationFrame(() => priceRef.current?.focus());
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!product) {
      setErrors({ productId: "Choose a product" });
      return;
    }
    setPending(true);
    try {
      const r = await setCustomerPriceAction(customerId, { productId: product.id, price });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? { price: r.message });
        toast.error(r.message);
        return;
      }
      toast.success(`Price set for ${product.name}`);
      setProduct(null);
      setPrice("");
      setErrors({});
      setAdding(false);
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove(p: CustomerPriceRow) {
    const r = await removeCustomerPriceAction(customerId, p.productId);
    if (!r.ok) {
      toast.error(r.message);
      return false;
    }
    toast.success(`${p.name} now uses the standard price`);
    router.refresh();
    return true;
  }

  return (
    <Card>
      <CardHeader
        title="Customer-specific prices"
        description="These prices replace the standard price on this customer's orders."
        actions={
          canManage && !adding ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus /> Add price
            </Button>
          ) : undefined
        }
      />
      {adding && canManage && (
        <form onSubmit={save} noValidate className="border-b border-line bg-surface-2 px-4 py-4 sm:px-5">
          <fieldset disabled={pending} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-start">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cp-product">Product</Label>
              <ProductPicker
                id="cp-product"
                value={product}
                onChange={(p) => {
                  setProduct(p);
                  setErrors((er) => ({ ...er, productId: "" }));
                  if (p) requestAnimationFrame(() => priceRef.current?.focus());
                }}
                customerId={customerId}
                invalid={!!errors.productId}
                describedBy={errors.productId ? "cp-product-error" : undefined}
              />
              {errors.productId && (
                <p id="cp-product-error" role="alert" className="text-xs text-bad">
                  {errors.productId}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cp-price">Customer price{product ? ` / ${unitLabel(product.sellingUnit, 1)}` : ""}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden>
                  ₹
                </span>
                <Input
                  ref={priceRef}
                  id="cp-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={product ? paiseToRupeeInput(product.standardPricePaise) : "0.00"}
                  className="tnum pl-7"
                  aria-invalid={!!errors.price || undefined}
                  aria-describedby={errors.price ? "cp-price-error" : product ? "cp-price-hint" : undefined}
                />
              </div>
              {errors.price ? (
                <p id="cp-price-error" role="alert" className="text-xs text-bad">
                  {errors.price}
                </p>
              ) : product ? (
                <p id="cp-price-hint" className="text-xs text-muted">
                  Standard {formatPaise(product.standardPricePaise)}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2 sm:pt-[22px]">
              <Button type="submit" variant="primary" size="md" loading={pending}>
                Save price
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setAdding(false);
                  setProduct(null);
                  setPrice("");
                  setErrors({});
                }}
              >
                Cancel
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {prices.length === 0 ? (
        <EmptyState
          icon={<IndianRupee />}
          title="Standard prices apply"
          description={canManage ? "Add a price here when this customer has a negotiated rate for a product." : "This customer pays standard catalogue prices."}
          className="py-10"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-xs text-muted">
                <th scope="col" className="px-4 py-2 font-medium sm:px-5">Product</th>
                <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Standard</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Customer price</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Difference</th>
                {canManage && <th scope="col" className="w-20 px-3 py-2"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.productId} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center gap-2 font-medium text-ink">
                      {p.name}
                      {p.archived && <Pill>Archived</Pill>}
                    </div>
                    <div className="font-mono text-[11px] text-muted">{p.sku}</div>
                  </td>
                  <td className="tnum hidden whitespace-nowrap px-3 py-2.5 text-right text-muted sm:table-cell">{formatPaise(p.standardPricePaise)}</td>
                  <td className="tnum whitespace-nowrap px-3 py-2.5 text-right font-medium text-ink">
                    {formatPaise(p.pricePaise)}
                    <span className="ml-1 text-xs font-normal text-faint">/ {unitLabel(p.sellingUnit, 1)}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Diff standard={p.standardPricePaise} price={p.pricePaise} />
                  </td>
                  {canManage && (
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit price for ${p.name}`} onClick={() => startEdit(p)}>
                          <Pencil />
                        </Button>
                        <ConfirmAction
                          title="Remove customer price?"
                          description={
                            <>
                              <b className="font-medium text-ink">{p.name}</b> will go back to the standard price of {formatPaise(p.standardPricePaise)} for this customer. Open orders will be re-checked.
                            </>
                          }
                          confirmLabel="Remove price"
                          onConfirm={() => remove(p)}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`Remove price for ${p.name}`} className="hover:text-bad">
                              <Trash2 />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
