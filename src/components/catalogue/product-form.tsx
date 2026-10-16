"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select } from "@/components/ui/field";
import { DialogClose, SheetContent } from "@/components/ui/dialog";
import { archiveProductAction, createProductAction, updateProductAction } from "@/server/actions/catalogue";
import { paiseToRupeeInput } from "@/lib/money";
import { REQUEST_UNITS, SELLING_UNITS, unitLabel } from "@/lib/units";
import { cn } from "@/lib/utils";
import { ConfirmAction } from "./confirm-action";
import { ALIAS_LANGS, type AliasLang, type ProductRow } from "./types";

type SpecRow = { id: number; key: string; value: string };
type ConvRow = { id: number; unit: string; factor: string };
type AliasRow = { id: number; text: string; language: AliasLang };

let seq = 0;
const nextId = () => ++seq;

function initialState(p?: ProductRow) {
  return {
    sku: p?.sku ?? "",
    name: p?.name ?? "",
    category: p?.category ?? "",
    brand: p?.brand ?? "",
    sellingUnit: p?.sellingUnit ?? "PIECE",
    price: p ? paiseToRupeeInput(p.pricePaise) : "",
    specs: p ? Object.entries(p.specs).map(([key, value]) => ({ id: nextId(), key, value })) : [{ id: nextId(), key: "", value: "" }],
    aliases: (p?.aliases ?? []).map((a) => ({ id: nextId(), text: a.text, language: a.language })),
    conversions: (p?.conversions ?? []).map((c) => ({ id: nextId(), unit: c.unit, factor: c.factor })),
  };
}

const FORM_ID = "product-form";

/** Drawer with the create / edit product form (view-only for operators). */
export function ProductSheet({
  product,
  categories,
  canManage,
  onDone,
}: {
  product?: ProductRow;
  categories: string[];
  canManage: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [s, setS] = React.useState(() => initialState(product));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const readOnly = !canManage;

  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const groupError = (prefix: string) => {
    const k = Object.keys(errors).find((key) => key === prefix || key.startsWith(`${prefix}.`));
    return k ? errors[k] : undefined;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setPending(true);
    setFormError(null);
    const input = {
      sku: s.sku,
      name: s.name,
      category: s.category,
      brand: s.brand || null,
      sellingUnit: s.sellingUnit,
      price: s.price,
      specs: s.specs.filter((r) => r.key.trim() || r.value.trim()).map(({ key, value }) => ({ key, value })),
      aliases: s.aliases.map(({ text, language }) => ({ text, language })),
      conversions: s.conversions.map(({ unit, factor }) => ({ unit, factor })),
    };
    try {
      if (product) {
        const r = await updateProductAction(product.id, input);
        if (!r.ok) return fail(r.message, r.fieldErrors);
        const n = r.data.affectedOrders;
        toast.success("Product saved", {
          description: n > 0 ? `${n} open order${n === 1 ? " was" : "s were"} flagged for price review.` : undefined,
        });
      } else {
        const r = await createProductAction(input);
        if (!r.ok) return fail(r.message, r.fieldErrors);
        toast.success(`${s.name.trim()} added to catalogue`);
      }
      setErrors({});
      onDone();
      router.refresh();
    } catch {
      fail("Couldn't reach the server. Your changes are still here — try again.");
    } finally {
      setPending(false);
    }
  }

  function fail(message: string, fieldErrors?: Record<string, string>) {
    setErrors(fieldErrors ?? {});
    setFormError(message);
    toast.error(message);
  }

  async function toggleArchive() {
    if (!product) return false;
    const r = await archiveProductAction(product.id, !product.archived);
    if (!r.ok) {
      toast.error(r.message);
      return false;
    }
    toast.success(product.archived ? "Product restored" : "Product archived");
    onDone();
    router.refresh();
    return true;
  }

  return (
    <SheetContent
      title={product ? product.name : "Add product"}
      description={product ? <span className="font-mono text-xs">{product.sku}</span> : "Add a product to your catalogue so it can be matched in orders."}
      footer={
        <>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm" disabled={pending}>
              {canManage ? "Cancel" : "Close"}
            </Button>
          </DialogClose>
          {canManage && (
            <Button type="submit" form={FORM_ID} variant="primary" size="sm" loading={pending}>
              {product ? "Save changes" : "Add product"}
            </Button>
          )}
        </>
      }
    >
    <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-6">
      {readOnly && (
        <p className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-muted">
          <Lock className="size-3.5" aria-hidden /> View only. Managers can edit the catalogue.
        </p>
      )}
      {formError && (
        <p role="alert" className="rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {formError}
        </p>
      )}

      <fieldset disabled={readOnly || pending} className="flex min-w-0 flex-col gap-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="SKU" htmlFor="p-sku" error={errors.sku} hint="Letters, numbers, - _ . /">
            <Input id="p-sku" value={s.sku} onChange={(e) => set("sku", e.target.value)} className="font-mono text-[13px]" autoComplete="off" spellCheck={false} />
          </Field>
          <Field label="Brand" htmlFor="p-brand" error={errors.brand} optional>
            <Input id="p-brand" value={s.brand} onChange={(e) => set("brand", e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Name" htmlFor="p-name" error={errors.name} className="sm:col-span-2">
            <Input id="p-name" value={s.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" placeholder="e.g. Anchor Roma 6A 1-way switch" />
          </Field>
          <Field label="Category" htmlFor="p-category" error={errors.category}>
            <Input id="p-category" list="p-category-list" value={s.category} onChange={(e) => set("category", e.target.value)} autoComplete="off" placeholder="e.g. Switch" />
          </Field>
          <datalist id="p-category-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Field label="Selling unit" htmlFor="p-unit" error={errors.sellingUnit}>
            <Select id="p-unit" value={s.sellingUnit} onChange={(e) => set("sellingUnit", e.target.value)}>
              {SELLING_UNITS.map((u) => (
                <option key={u} value={u}>
                  {unitLabel(u, 1)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="p-price">Standard price per {unitLabel(s.sellingUnit, 1)}</Label>
            <div className="relative sm:max-w-56">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden>
                ₹
              </span>
              <Input
                id="p-price"
                value={s.price}
                onChange={(e) => set("price", e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                className="tnum pl-7"
                aria-invalid={!!errors.price || undefined}
                aria-describedby={errors.price ? "p-price-error" : undefined}
              />
            </div>
            {errors.price && (
              <p id="p-price-error" role="alert" className="text-xs text-bad">
                {errors.price}
              </p>
            )}
          </div>
        </section>

        <SpecsEditor rows={s.specs} onChange={(v) => set("specs", v)} error={groupError("specs")} readOnly={readOnly} />

        <AliasesEditor rows={s.aliases} onChange={(v) => set("aliases", v)} error={groupError("aliases")} readOnly={readOnly} />

        <ConversionsEditor
          rows={s.conversions}
          sellingUnit={s.sellingUnit}
          onChange={(v) => set("conversions", v)}
          error={groupError("conversions")}
          readOnly={readOnly}
        />
      </fieldset>

      {product && canManage && (
        <section className="flex flex-col gap-2 border-t border-line pt-5">
          <h3 className="text-[13px] font-semibold text-ink">{product.archived ? "Restore product" : "Archive product"}</h3>
          <p className="text-[13px] text-muted">
            {product.archived
              ? "Restoring makes this product available for matching in new orders again."
              : "Archived products are not matched in new orders. Open orders that use it will be flagged for review. You can restore it later."}
          </p>
          <div>
            <ConfirmAction
              title={product.archived ? `Restore ${product.name}?` : `Archive ${product.name}?`}
              description={
                product.archived
                  ? "It will be matched in new orders again."
                  : "It won't be matched in new orders, and open orders using it will be flagged for review."
              }
              confirmLabel={product.archived ? "Restore" : "Archive"}
              tone={product.archived ? "primary" : "danger"}
              onConfirm={toggleArchive}
              trigger={
                <Button type="button" variant={product.archived ? "secondary" : "danger"} size="sm">
                  {product.archived ? <ArchiveRestore /> : <Archive />}
                  {product.archived ? "Restore" : "Archive"}
                </Button>
              }
            />
          </div>
        </section>
      )}
    </form>
    </SheetContent>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: React.ReactNode }) {
  return (
    <div className="mb-2">
      <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function GroupError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-xs text-bad">
      {error}
    </p>
  );
}

function SpecsEditor({ rows, onChange, error, readOnly }: { rows: SpecRow[]; onChange: (r: SpecRow[]) => void; error?: string; readOnly: boolean }) {
  const update = (id: number, patch: Partial<SpecRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <section aria-labelledby="specs-h">
      <div id="specs-h">
        <SectionHead title="Specifications" hint="Used to tell similar products apart, e.g. rating = 6A, colour = Red." />
      </div>
      <div className="flex flex-col gap-2">
        {rows.length === 0 && <p className="text-[13px] text-faint">No specifications.</p>}
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2">
            <Input
              aria-label={`Specification ${i + 1} name`}
              value={r.key}
              onChange={(e) => update(r.id, { key: e.target.value })}
              placeholder="rating"
              className="h-8 w-36 shrink-0 text-[13px]"
              aria-invalid={!!error || undefined}
            />
            <span className="text-faint" aria-hidden>
              =
            </span>
            <Input
              aria-label={`Specification ${i + 1} value`}
              value={r.value}
              onChange={(e) => update(r.id, { value: e.target.value })}
              placeholder="6A"
              className="h-8 min-w-0 flex-1 text-[13px]"
              aria-invalid={!!error || undefined}
            />
            {!readOnly && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove specification ${r.key || i + 1}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))}>
                <X />
              </Button>
            )}
          </div>
        ))}
      </div>
      <GroupError id="specs-error" error={error} />
      {!readOnly && rows.length < 12 && (
        <Button type="button" variant="link" size="sm" className="mt-2" onClick={() => onChange([...rows, { id: nextId(), key: "", value: "" }])}>
          <Plus /> Add specification
        </Button>
      )}
    </section>
  );
}

function AliasesEditor({ rows, onChange, error, readOnly }: { rows: AliasRow[]; onChange: (r: AliasRow[]) => void; error?: string; readOnly: boolean }) {
  return (
    <section aria-labelledby="aliases-h">
      <div id="aliases-h">
        <SectionHead title="What customers call it" hint="Aliases help OrderSathi match messages like “erra wire” or “ఎర్ర వైరు” to this product." />
      </div>
      <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
        {ALIAS_LANGS.map((lang) => (
          <AliasGroup
            key={lang.value}
            lang={lang.value}
            label={lang.label}
            rows={rows.filter((r) => r.language === lang.value)}
            onAdd={(text) => onChange([...rows, { id: nextId(), text, language: lang.value }])}
            onRemove={(id) => onChange(rows.filter((r) => r.id !== id))}
            readOnly={readOnly}
          />
        ))}
      </div>
      <GroupError id="aliases-error" error={error} />
    </section>
  );
}

const PLACEHOLDER: Record<AliasLang, string> = { EN: "e.g. light switch", TE: "ఉదా. స్విచ్", TRANSLIT: "e.g. switchu" };

function AliasGroup({
  lang,
  label,
  rows,
  onAdd,
  onRemove,
  readOnly,
}: {
  lang: AliasLang;
  label: string;
  rows: AliasRow[];
  onAdd: (text: string) => void;
  onRemove: (id: number) => void;
  readOnly: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const inputId = `alias-add-${lang}`;
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (!rows.some((r) => r.text.toLowerCase() === t.toLowerCase())) onAdd(t);
    setDraft("");
  };
  const isTe = lang === "TE";
  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <ul className="flex flex-wrap gap-1.5" aria-label={`${label} aliases`}>
        {rows.length === 0 && <li className="text-[13px] text-faint">None yet</li>}
        {rows.map((r) => (
          <li
            key={r.id}
            lang={isTe ? "te" : undefined}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 py-0.5 pl-2 text-ink",
              isTe ? "text-[14px] leading-6" : "text-[13px]",
              readOnly ? "pr-2" : "pr-0.5",
            )}
          >
            {r.text}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemove(r.id)}
                className="rounded p-0.5 text-faint hover:bg-sunken hover:text-ink"
                aria-label={`Remove alias ${r.text}`}
              >
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Label htmlFor={inputId} className="sr-only">
            Add {label} alias
          </Label>
          <Input
            id={inputId}
            lang={isTe ? "te" : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={PLACEHOLDER[lang]}
            className="h-8 text-[13px]"
            autoComplete="off"
          />
          <Button type="button" size="sm" onClick={add} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function ConversionsEditor({
  rows,
  sellingUnit,
  onChange,
  error,
  readOnly,
}: {
  rows: ConvRow[];
  sellingUnit: string;
  onChange: (r: ConvRow[]) => void;
  error?: string;
  readOnly: boolean;
}) {
  const update = (id: number, patch: Partial<ConvRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const options = REQUEST_UNITS.filter((u) => u !== sellingUnit);
  const firstFree = () => options.find((u) => !rows.some((r) => r.unit === u)) ?? options[0];
  return (
    <section aria-labelledby="conv-h">
      <div id="conv-h">
        <SectionHead title="Unit conversions" hint="Only these conversions are used. OrderSathi never converts units on its own." />
      </div>
      <div className="flex flex-col gap-2">
        {rows.length === 0 && <p className="text-[13px] text-faint">No conversions — orders in other units will be flagged for review.</p>}
        {rows.map((r, i) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            <span className="w-3 text-right tnum">1</span>
            <Select
              aria-label={`Conversion ${i + 1} unit`}
              value={r.unit}
              onChange={(e) => update(r.id, { unit: e.target.value })}
              className="w-32"
              aria-invalid={!!error || undefined}
            >
              {options.map((u) => (
                <option key={u} value={u}>
                  {unitLabel(u, 1)}
                </option>
              ))}
              {r.unit === sellingUnit && <option value={r.unit}>{unitLabel(r.unit, 1)}</option>}
            </Select>
            <span aria-hidden>=</span>
            <Input
              aria-label={`Conversion ${i + 1}: number of ${unitLabel(sellingUnit)}`}
              value={r.factor}
              onChange={(e) => update(r.id, { factor: e.target.value })}
              inputMode="decimal"
              className="tnum h-9 w-24"
              placeholder="20"
              aria-invalid={!!error || undefined}
            />
            <span>{unitLabel(sellingUnit, Number(r.factor) || 2)}</span>
            {!readOnly && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove conversion for ${unitLabel(r.unit, 1)}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))}>
                <X />
              </Button>
            )}
          </div>
        ))}
      </div>
      <GroupError id="conversions-error" error={error} />
      {!readOnly && rows.length < 8 && (
        <Button type="button" variant="link" size="sm" className="mt-2" onClick={() => onChange([...rows, { id: nextId(), unit: firstFree(), factor: "" }])}>
          <Plus /> Add conversion
        </Button>
      )}
    </section>
  );
}
