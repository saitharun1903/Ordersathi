"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, MessageSquareQuote, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/field";
import { Pill } from "@/components/ui/status";
import { addCustomerAliasAction, removeCustomerAliasAction } from "@/server/actions/catalogue";
import type { ProductBrief } from "@/server/orders/view-types";
import { ConfirmAction } from "@/components/catalogue/confirm-action";
import { ALIAS_LANGS, type AliasLang } from "@/components/catalogue/types";
import { ProductPicker } from "./product-picker";

export type CustomerAliasRow = {
  id: string;
  text: string;
  language: AliasLang;
  product: { id: string; sku: string; name: string };
};

const LANG_TONE: Record<AliasLang, "neutral" | "brand" | "info"> = { EN: "neutral", TE: "brand", TRANSLIT: "info" };
const LANG_SHORT: Record<AliasLang, string> = { EN: "English", TE: "Telugu", TRANSLIT: "Translit" };

export function CustomerAliases({ customerId, aliases, canManage }: { customerId: string; aliases: CustomerAliasRow[]; canManage: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [product, setProduct] = React.useState<ProductBrief | null>(null);
  const [text, setText] = React.useState("");
  const [language, setLanguage] = React.useState<AliasLang>("TRANSLIT");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const textRef = React.useRef<HTMLInputElement>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (!product) fe.productId = "Choose a product";
    if (text.trim().length < 2) fe.text = "Enter at least 2 characters";
    if (Object.keys(fe).length) {
      setErrors(fe);
      return;
    }
    setPending(true);
    try {
      const r = await addCustomerAliasAction(customerId, { productId: product!.id, text, language });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? { text: r.message });
        toast.error(r.message);
        return;
      }
      toast.success(`“${text.trim()}” now matches ${product!.name}`);
      setText("");
      setProduct(null);
      setErrors({});
      setAdding(false);
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove(a: CustomerAliasRow) {
    const r = await removeCustomerAliasAction(customerId, a.id);
    if (!r.ok) {
      toast.error(r.message);
      return false;
    }
    toast.success("Wording removed");
    router.refresh();
    return true;
  }

  return (
    <Card>
      <CardHeader
        title="Customer wording"
        description="When this customer uses these words, OrderSathi matches the product directly."
        actions={
          canManage && !adding ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus /> Add wording
            </Button>
          ) : undefined
        }
      />
      {adding && canManage && (
        <form onSubmit={add} noValidate className="border-b border-line bg-surface-2 px-4 py-4 sm:px-5">
          <fieldset disabled={pending} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ca-text">They say</Label>
              <Input
                ref={textRef}
                id="ca-text"
                lang={language === "TE" ? "te" : undefined}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={language === "TE" ? "ఉదా. మామూలు స్విచ్" : "e.g. maamulu switch"}
                autoComplete="off"
                aria-invalid={!!errors.text || undefined}
                aria-describedby={errors.text ? "ca-text-error" : undefined}
              />
              {errors.text && (
                <p id="ca-text-error" role="alert" className="text-xs text-bad">
                  {errors.text}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ca-lang">Language</Label>
              <Select id="ca-lang" value={language} onChange={(e) => setLanguage(e.target.value as AliasLang)}>
                {ALIAS_LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.value === "TRANSLIT" ? "Telugu in English letters" : l.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ca-product">Means product</Label>
              <ProductPicker
                id="ca-product"
                value={product}
                onChange={(p) => {
                  setProduct(p);
                  setErrors((er) => ({ ...er, productId: "" }));
                }}
                customerId={customerId}
                invalid={!!errors.productId}
                describedBy={errors.productId ? "ca-product-error" : undefined}
              />
              {errors.productId && (
                <p id="ca-product-error" role="alert" className="text-xs text-bad">
                  {errors.productId}
                </p>
              )}
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" variant="primary" size="sm" loading={pending}>
                Add wording
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAdding(false);
                  setErrors({});
                }}
              >
                Cancel
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {aliases.length === 0 ? (
        <EmptyState
          icon={<MessageSquareQuote />}
          title="No customer wording yet"
          description="Teach OrderSathi the words this customer uses for products, e.g. “maamulu switch” for a standard 1-way switch."
          className="py-10"
        />
      ) : (
        <ul className="divide-y divide-line">
          {aliases.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] sm:flex-row sm:items-center sm:gap-2">
                <span className="flex items-center gap-2">
                  <span lang={a.language === "TE" ? "te" : undefined} className={a.language === "TE" ? "text-[14px] font-medium text-ink" : "font-medium text-ink"}>
                    “{a.text}”
                  </span>
                  <Pill tone={LANG_TONE[a.language]}>{LANG_SHORT[a.language]}</Pill>
                </span>
                <ArrowRight className="hidden size-3.5 shrink-0 text-faint sm:block" aria-label="matches" />
                <span className="min-w-0 truncate text-ink-2">
                  <span className="sm:hidden text-faint">→ </span>
                  {a.product.name} <span className="font-mono text-[11px] text-muted">{a.product.sku}</span>
                </span>
              </div>
              {canManage && (
                <ConfirmAction
                  title="Remove this wording?"
                  description={
                    <>
                      “{a.text}” will no longer match <b className="font-medium text-ink">{a.product.name}</b> directly for this customer.
                    </>
                  }
                  confirmLabel="Remove"
                  onConfirm={() => remove(a)}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove wording “${a.text}”`} className="hover:text-bad">
                      <Trash2 />
                    </Button>
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
