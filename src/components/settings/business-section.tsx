"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateSettingsAction } from "@/server/actions/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { LANGUAGE_OPTIONS, stateOptions, type LanguageCode } from "./options";
import { NETWORK_ERROR, ReadOnlyNote } from "./section-bits";

export type BusinessData = {
  name: string;
  city: string;
  state: string;
  addressLine: string;
  phone: string;
  gstin: string;
  preferredLanguage: LanguageCode;
  taxRatePercent: string;
  taxLabel: string;
};

type Errors = Partial<Record<keyof BusinessData, string>>;

export function BusinessSection({ data, canEdit }: { data: BusinessData; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = React.useState(data);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(data);
  const disabled = !canEdit || pending;

  const set = (k: keyof BusinessData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const v: Errors = {};
    if (form.name.trim().length < 2) v.name = "Business name is required";
    if (form.city.trim().length < 2) v.city = "City is required";
    if (form.taxRatePercent.trim()) {
      const n = Number(form.taxRatePercent);
      if (!Number.isFinite(n) || n < 0 || n > 28) v.taxRatePercent = "Enter a rate between 0 and 28";
      else if (!form.taxLabel.trim()) v.taxLabel = "Name the tax line, e.g. “GST 18%”";
    }
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length) return;
    setPending(true);
    try {
      const r = await updateSettingsAction({ ...form, taxRatePercent: form.taxRatePercent.trim() || null });
      if (!r.ok) {
        setErrors((r.fieldErrors ?? {}) as Errors);
        setFormError(r.message);
        toast.error("Settings not saved", { description: r.message });
        return;
      }
      toast.success("Business settings saved");
      router.refresh();
    } catch {
      setFormError(NETWORK_ERROR);
      toast.error(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Business details" description="Shown on order confirmations and used to interpret incoming orders." />
      <form noValidate onSubmit={submit} className="flex flex-col gap-5 p-4 sm:p-5">
        {!canEdit && <ReadOnlyNote>Only owners can change business settings. Ask an owner if something here needs updating.</ReadOnlyNote>}
        {formError && (
          <p role="alert" className="rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[13px] text-bad">
            {formError}
          </p>
        )}
        <Field label="Business name" htmlFor="s-name" error={errors.name}>
          <Input id="s-name" autoComplete="organization" value={form.name} onChange={set("name")} disabled={disabled} />
        </Field>
        <Field label="Address" htmlFor="s-address" error={errors.addressLine} optional>
          <Input id="s-address" autoComplete="street-address" value={form.addressLine} onChange={set("addressLine")} disabled={disabled} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="s-city" error={errors.city}>
            <Input id="s-city" autoComplete="address-level2" value={form.city} onChange={set("city")} disabled={disabled} />
          </Field>
          <Field label="State" htmlFor="s-state" error={errors.state}>
            <Select id="s-state" value={form.state} onChange={set("state")} disabled={disabled}>
              {stateOptions(data.state).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="s-phone" error={errors.phone} optional>
            <Input id="s-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} disabled={disabled} />
          </Field>
          <Field label="GSTIN" htmlFor="s-gstin" error={errors.gstin} optional hint="15 characters, e.g. 36ABCDE1234F1Z5">
            <Input id="s-gstin" className="font-mono uppercase" maxLength={15} value={form.gstin} onChange={set("gstin")} disabled={disabled} />
          </Field>
        </div>
        <Field label="Preferred order language" htmlFor="s-lang" error={errors.preferredLanguage} hint="Helps OrderSathi read voice notes and messages. Auto-detect handles mixed Telugu and English.">
          <Select id="s-lang" value={form.preferredLanguage} onChange={set("preferredLanguage")} disabled={disabled}>
            {LANGUAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="rounded-lg border border-line bg-surface-2 p-4">
          <legend className="px-1 text-[13px] font-semibold text-ink">Tax on order confirmations</legend>
          <p className="text-[12.5px] text-muted">Leave blank to apply no tax. OrderSathi never assumes a tax rate.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)]">
            <Field label="Rate (%)" htmlFor="s-tax-rate" error={errors.taxRatePercent} optional>
              <Input id="s-tax-rate" inputMode="decimal" className="tnum" placeholder="e.g. 18" value={form.taxRatePercent} onChange={set("taxRatePercent")} disabled={disabled} />
            </Field>
            <Field label="Label" htmlFor="s-tax-label" error={errors.taxLabel} optional={!form.taxRatePercent.trim()} hint="Printed on the confirmation, e.g. “GST 18%”">
              <Input id="s-tax-label" value={form.taxLabel} onChange={set("taxLabel")} disabled={disabled} />
            </Field>
          </div>
        </fieldset>

        {canEdit && (
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={!dirty || pending}
              onClick={() => {
                setForm(data);
                setErrors({});
                setFormError(null);
              }}
            >
              Discard changes
            </Button>
            <Button type="submit" variant="primary" loading={pending} disabled={!dirty}>
              Save changes
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
