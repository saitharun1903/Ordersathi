"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, FileSpreadsheet, FlaskConical, Inbox, LayoutDashboard, PackagePlus, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SELLING_UNITS, unitLabel } from "@/lib/units";
import { createSampleWorkspaceAction, createWorkspaceAction, setOnboardingStepAction } from "@/server/actions/workspace";
import { createCustomerAction, createProductAction } from "@/server/actions/catalogue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { INDIAN_STATES, LANGUAGE_OPTIONS, type LanguageCode } from "@/components/settings/options";

type FieldErrors = Record<string, string | undefined>;

async function persistStep(step: number) {
  try {
    const r = await setOnboardingStepAction(step);
    if (!r.ok) toast.warning("Your setup progress wasn't saved", { description: "You can carry on — this only affects where setup resumes next time." });
  } catch {
    toast.warning("Your setup progress wasn't saved", { description: "Check your connection. You can carry on." });
  }
}

const NETWORK_ERROR = "Could not reach OrderSathi. Check your connection and try again.";

function StepHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{eyebrow}</p>
      <h1 className="mt-1.5 text-[26px] font-bold tracking-[-0.03em] text-ink sm:text-[30px]">{title}</h1>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ───────────────────────── Step 0: choose ─────────────────────────

export function ChooseStep({ firstName, onSetup }: { firstName: string; onSetup: () => void }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function exploreSample() {
    setPending(true);
    setError(null);
    try {
      const r = await createSampleWorkspaceAction();
      if (!r.ok) {
        setError(r.message);
        toast.error("Could not open the sample workspace", { description: r.message });
        setPending(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
      toast.error(NETWORK_ERROR);
      setPending(false);
    }
  }

  return (
    <div>
      <StepHeading
        eyebrow="Welcome"
        title={`Namaste, ${firstName}. How would you like to start?`}
        description="Set up your own business to process real orders, or look around a sample workspace first. You can do both — switch between workspaces any time."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onSetup}
          disabled={pending}
          className="group flex flex-col rounded-xl border border-line bg-surface p-5 text-left shadow-[var(--shadow-card)] transition-colors hover:border-brand-line focus-visible:border-brand disabled:opacity-60"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand text-white">
            <Building2 className="size-5" aria-hidden />
          </span>
          <span className="mt-4 text-[15px] font-semibold text-ink">Set up my business</span>
          <span className="mt-1 text-[13px] leading-relaxed text-muted">
            Add your business details, a few products and a customer. Takes about five minutes.
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-brand">
            Start setup <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </button>

        <button
          type="button"
          onClick={exploreSample}
          disabled={pending}
          aria-busy={pending || undefined}
          className="group flex flex-col rounded-xl border border-line bg-surface p-5 text-left shadow-[var(--shadow-card)] transition-colors hover:border-warn-line focus-visible:border-brand disabled:opacity-60"
        >
          <span className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-lg bg-warn-soft text-warn">
              <FlaskConical className="size-5" aria-hidden />
            </span>
            <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">Demo data</span>
          </span>
          <span className="mt-4 text-[15px] font-semibold text-ink">Explore the sample workspace</span>
          <span className="mt-1 text-[13px] leading-relaxed text-muted">
            A private copy of a fictional electrical wholesaler with products, customers and orders to try. Kept separate from your live data.
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink-2">
            {pending ? "Preparing sample workspace…" : "Open sample"}
            {!pending && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />}
          </span>
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── Step 1: business ─────────────────────────

function LanguageRadios({ value, onChange, disabled }: { value: LanguageCode; onChange: (v: LanguageCode) => void; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-[13px] font-medium text-ink-2">Language your customers usually order in</legend>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
        {LANGUAGE_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-surface px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/30",
              value === o.value ? "border-brand bg-brand-soft/40" : "border-line-strong hover:border-ink/25",
            )}
          >
            <input type="radio" name="preferredLanguage" value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-0.5 accent-[#0f0f0e]" />
            <span>
              <span className="block text-[13px] font-medium text-ink">{o.label}</span>
              <span className="block text-[12px] text-muted">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function BusinessStep({ onDone, onBack }: { onDone: (name: string) => void; onBack?: () => void }) {
  const [form, setForm] = React.useState({ name: "", city: "", state: "Telangana", preferredLanguage: "AUTO" as LanguageCode });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v: FieldErrors = {};
    if (form.name.trim().length < 2) v.name = "Business name is required";
    if (form.city.trim().length < 2) v.city = "City is required";
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length) return document.getElementById(v.name ? "biz-name" : "biz-city")?.focus();
    setPending(true);
    try {
      const r = await createWorkspaceAction(form);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.message);
        toast.error("Could not create your workspace", { description: r.message });
        setPending(false);
        return;
      }
      await persistStep(2);
      toast.success(`${form.name.trim()} is ready`);
      onDone(form.name.trim());
    } catch {
      setFormError(NETWORK_ERROR);
      toast.error(NETWORK_ERROR);
      setPending(false);
    }
  }

  return (
    <div>
      <StepHeading eyebrow="Step 1 of 4" title="Your business" description="This appears on order confirmations. You can change it later in Settings." />
      <Card className="p-4 sm:p-6">
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[13px] text-bad">
              {formError}
            </p>
          )}
          <Field label="Business name" htmlFor="biz-name" error={errors.name}>
            <Input id="biz-name" autoComplete="organization" placeholder="e.g. Sri Venkateswara Electricals" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={pending} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="biz-city" error={errors.city}>
              <Input id="biz-city" autoComplete="address-level2" placeholder="e.g. Hyderabad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={pending} />
            </Field>
            <Field label="State" htmlFor="biz-state" error={errors.state}>
              <Select id="biz-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} disabled={pending}>
                {INDIAN_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
          <LanguageRadios value={form.preferredLanguage} onChange={(v) => setForm({ ...form, preferredLanguage: v })} disabled={pending} />
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {onBack ? (
              <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
                <ArrowLeft aria-hidden /> Back
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary" loading={pending}>
              Create workspace {!pending && <ArrowRight aria-hidden />}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ───────────────────────── Step 2: catalogue ─────────────────────────

const CATEGORY_SUGGESTIONS = ["Switches & sockets", "Wires & cables", "MCBs & distribution boards", "Lighting", "Fans", "Conduits & fittings", "Accessories"];

type AddedProduct = { id: string; sku: string; name: string; unit: string; price: string };

export function CatalogueStep({ businessName, onDone }: { businessName: string | null; onDone: () => void }) {
  const [mode, setMode] = React.useState<"choose" | "quick">("choose");
  const [added, setAdded] = React.useState<AddedProduct[]>([]);
  const [continuing, setContinuing] = React.useState(false);

  async function next() {
    setContinuing(true);
    await persistStep(3);
    onDone();
  }

  return (
    <div>
      <StepHeading
        eyebrow="Step 2 of 4"
        title="Add your catalogue"
        description={
          <>
            OrderSathi matches every order line to a product you sell{businessName ? <> at {businessName}</> : null}. Without a catalogue, lines stay unmatched for you to
            review.
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex flex-col p-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-sunken text-ink-2">
            <FileSpreadsheet className="size-4.5" aria-hidden />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-ink">Import a CSV</h2>
          <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">
            Best for an existing price list. Download the template, fill it in a spreadsheet and upload. Your setup progress is saved — come back to{" "}
            <span className="font-mono text-[12px] text-ink-2">/onboarding</span> to finish.
          </p>
          <Button asChild variant="secondary" className="mt-4 self-start">
            <Link href="/catalogue/import">Go to CSV import</Link>
          </Button>
        </Card>
        <Card className={cn("flex flex-col p-5", mode === "quick" && "border-brand-line")}>
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <PackagePlus className="size-4.5" aria-hidden />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-ink">Add a few products now</h2>
          <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">Enter your fastest-moving items to try OrderSathi right away. Add the rest later.</p>
          {mode === "choose" && (
            <Button variant="primary" className="mt-4 self-start" onClick={() => setMode("quick")}>
              <Plus aria-hidden /> Add products
            </Button>
          )}
        </Card>
      </div>

      {mode === "quick" && <QuickProductForm onAdded={(p) => setAdded((a) => [...a, p])} />}

      {added.length > 0 && (
        <Card className="mt-4">
          <div className="border-b border-line px-4 py-2.5 text-[13px] font-semibold text-ink sm:px-5">
            Added {added.length} {added.length === 1 ? "product" : "products"}
          </div>
          <ul className="divide-y divide-line">
            {added.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <Check className="size-4 shrink-0 text-ok" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                  <span className="block font-mono text-[11.5px] text-muted">{p.sku}</span>
                </span>
                <span className="whitespace-nowrap text-[13px] text-ink-2 tnum">
                  ₹{p.price} / {p.unit}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {added.length === 0 ? (
          <Button variant="ghost" onClick={next} loading={continuing}>
            Skip for now
          </Button>
        ) : (
          <Button variant="primary" onClick={next} loading={continuing}>
            Continue {!continuing && <ArrowRight aria-hidden />}
          </Button>
        )}
      </div>
    </div>
  );
}

const EMPTY_PRODUCT = { sku: "", name: "", category: "", brand: "", sellingUnit: "PIECE", price: "" };

function QuickProductForm({ onAdded }: { onAdded: (p: AddedProduct) => void }) {
  const [form, setForm] = React.useState(EMPTY_PRODUCT);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const skuRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    skuRef.current?.focus();
  }, []);

  const set = (k: keyof typeof EMPTY_PRODUCT) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v: FieldErrors = {};
    if (!form.sku.trim()) v.sku = "SKU is required";
    if (form.name.trim().length < 2) v.name = "Name is required";
    if (form.category.trim().length < 2) v.category = "Category is required";
    if (!form.price.trim()) v.price = "Price is required";
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length) return;
    setPending(true);
    try {
      const r = await createProductAction({ ...form, brand: form.brand || null });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.message);
        toast.error("Product not added", { description: r.message });
        return;
      }
      onAdded({ id: r.data.id, sku: form.sku.trim(), name: form.name.trim(), unit: unitLabel(form.sellingUnit, 1), price: form.price.trim() });
      toast.success(`Added ${form.name.trim()}`);
      // Keep category, brand and unit — the next item is often similar.
      setForm((f) => ({ ...EMPTY_PRODUCT, category: f.category, brand: f.brand, sellingUnit: f.sellingUnit }));
      setErrors({});
      skuRef.current?.focus();
    } catch {
      setFormError(NETWORK_ERROR);
      toast.error(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mt-4 p-4 sm:p-5">
      <form noValidate onSubmit={submit} aria-label="Add a product" className="flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[13px] text-bad">
            {formError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
          <Field label="SKU" htmlFor="p-sku" error={errors.sku}>
            <Input ref={skuRef} id="p-sku" className="font-mono" placeholder="SW-6A-WH" value={form.sku} onChange={set("sku")} disabled={pending} autoCapitalize="characters" />
          </Field>
          <Field label="Product name" htmlFor="p-name" error={errors.name}>
            <Input id="p-name" placeholder="Modular switch 6A, white" value={form.name} onChange={set("name")} disabled={pending} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="p-category" error={errors.category}>
            <Input id="p-category" list="p-category-options" placeholder="Switches & sockets" value={form.category} onChange={set("category")} disabled={pending} />
          </Field>
          <Field label="Brand" htmlFor="p-brand" error={errors.brand} optional>
            <Input id="p-brand" value={form.brand} onChange={set("brand")} disabled={pending} />
          </Field>
        </div>
        <datalist id="p-category-options">
          {CATEGORY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sold per" htmlFor="p-unit" error={errors.sellingUnit}>
            <Select id="p-unit" value={form.sellingUnit} onChange={set("sellingUnit")} disabled={pending}>
              {SELLING_UNITS.map((u) => (
                <option key={u} value={u}>
                  {capitalize(unitLabel(u, 1))}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Selling price (₹)" htmlFor="p-price" error={errors.price} hint={`Per ${unitLabel(form.sellingUnit, 1)}, before tax`}>
            <Input id="p-price" inputMode="decimal" placeholder="120.00" className="tnum" value={form.price} onChange={set("price")} disabled={pending} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={pending}>
            {!pending && <Plus aria-hidden />} Add product
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ───────────────────────── Step 3: customer ─────────────────────────

const EMPTY_CUSTOMER = { name: "", contactName: "", phone: "", city: "", preferredLanguage: "AUTO" as LanguageCode };

export function CustomerStep({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [form, setForm] = React.useState(EMPTY_CUSTOMER);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [added, setAdded] = React.useState<string[]>([]);
  const [continuing, setContinuing] = React.useState(false);

  const set = (k: keyof typeof EMPTY_CUSTOMER) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v: FieldErrors = {};
    if (form.name.trim().length < 2) v.name = "Shop or business name is required";
    setErrors(v);
    setFormError(null);
    if (v.name) return document.getElementById("c-name")?.focus();
    setPending(true);
    try {
      const r = await createCustomerAction(form);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.message);
        toast.error("Customer not added", { description: r.message });
        return;
      }
      setAdded((a) => [...a, form.name.trim()]);
      toast.success(`Added ${form.name.trim()}`);
      setForm(EMPTY_CUSTOMER);
      setErrors({});
    } catch {
      setFormError(NETWORK_ERROR);
      toast.error(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  async function next() {
    setContinuing(true);
    await persistStep(4);
    onDone();
  }

  return (
    <div>
      <StepHeading
        eyebrow="Step 3 of 4"
        title="Add a customer"
        description="Orders are linked to the shop or contractor who sent them. OrderSathi uses each customer's special prices and the names they use for products."
      />
      <Card className="p-4 sm:p-6">
        <form noValidate onSubmit={submit} aria-label="Add a customer" className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[13px] text-bad">
              {formError}
            </p>
          )}
          <Field label="Shop or business name" htmlFor="c-name" error={errors.name}>
            <Input id="c-name" placeholder="e.g. Sai Ram Electricals" value={form.name} onChange={set("name")} disabled={pending} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person" htmlFor="c-contact" error={errors.contactName} optional>
              <Input id="c-contact" autoComplete="off" value={form.contactName} onChange={set("contactName")} disabled={pending} />
            </Field>
            <Field label="Phone" htmlFor="c-phone" error={errors.phone} optional>
              <Input id="c-phone" type="tel" inputMode="tel" placeholder="+91 98xxx xxxxx" value={form.phone} onChange={set("phone")} disabled={pending} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="c-city" error={errors.city} optional>
              <Input id="c-city" value={form.city} onChange={set("city")} disabled={pending} />
            </Field>
            <Field label="Language" htmlFor="c-lang" error={errors.preferredLanguage}>
              <Select id="c-lang" value={form.preferredLanguage} onChange={set("preferredLanguage")} disabled={pending}>
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant={added.length ? "secondary" : "primary"} loading={pending}>
              {!pending && <UserPlus aria-hidden />} {added.length ? "Add another" : "Add customer"}
            </Button>
          </div>
        </form>
      </Card>

      {added.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Customers added">
          {added.map((n, i) => (
            <li key={`${n}-${i}`} className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 text-[12.5px] font-medium text-brand-ink">
              <Check className="size-3.5" aria-hidden /> {n}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} disabled={continuing}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        {added.length === 0 ? (
          <Button variant="ghost" onClick={next} loading={continuing}>
            Skip for now
          </Button>
        ) : (
          <Button variant="primary" onClick={next} loading={continuing}>
            Continue {!continuing && <ArrowRight aria-hidden />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Step 4: first order ─────────────────────────

export function FinishStep({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<null | "order" | "dashboard">(null);

  async function go(target: "order" | "dashboard") {
    setPending(target);
    await persistStep(5);
    router.push(target === "order" ? "/orders/new" : "/dashboard");
    router.refresh();
  }

  return (
    <div>
      <StepHeading
        eyebrow="Step 4 of 4"
        title="Process your first order"
        description="Paste a WhatsApp message, upload a photo of a handwritten list, or record a voice note. OrderSathi drafts the order and highlights anything that needs a decision — nothing is confirmed until you approve it."
      />
      <Card className="p-5 sm:p-6">
        <ol className="flex flex-col gap-3 text-[13.5px] text-ink-2">
          {["Drop in the customer's message, photo or voice note", "Review matched lines — amber flags need your answer", "Approve and share the confirmation"].map((t, i) => (
            <li key={t} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sunken text-xs font-semibold text-ink-2 tnum">{i + 1}</span>
              <span className="pt-0.5">{t}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="lg" onClick={() => go("order")} loading={pending === "order"} disabled={pending !== null}>
            {pending !== "order" && <Inbox aria-hidden />} Process your first order
          </Button>
          <Button variant="secondary" size="lg" onClick={() => go("dashboard")} loading={pending === "dashboard"} disabled={pending !== null}>
            {pending !== "dashboard" && <LayoutDashboard aria-hidden />} Go to dashboard
          </Button>
        </div>
      </Card>
      <div className="mt-6">
        <Button variant="ghost" onClick={onBack} disabled={pending !== null}>
          <ArrowLeft aria-hidden /> Back
        </Button>
      </div>
    </div>
  );
}
