"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createCustomerAction, updateCustomerAction } from "@/server/actions/catalogue";

export type CustomerFormValues = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  city: string | null;
  preferredLanguage: "AUTO" | "EN" | "TE";
  notes: string | null;
};

const FORM_ID = "customer-form";

/** Add / edit customer dialog. `trigger` is the button that opens it. */
export function CustomerDialog({ customer, trigger }: { customer?: CustomerFormValues; trigger: React.ReactElement }) {
  const [open, setOpen] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setNonce((n) => n + 1);
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {open && <CustomerDialogBody key={nonce} customer={customer} onDone={() => setOpen(false)} />}
    </Dialog>
  );
}

function CustomerDialogBody({ customer, onDone }: { customer?: CustomerFormValues; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = React.useState({
    name: customer?.name ?? "",
    contactName: customer?.contactName ?? "",
    phone: customer?.phone ?? "",
    city: customer?.city ?? "",
    preferredLanguage: customer?.preferredLanguage ?? "AUTO",
    notes: customer?.notes ?? "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      if (customer) {
        const r = await updateCustomerAction(customer.id, v);
        if (!r.ok) {
          setErrors(r.fieldErrors ?? {});
          toast.error(r.message);
          return;
        }
        toast.success("Customer updated");
        onDone();
        router.refresh();
      } else {
        const r = await createCustomerAction(v);
        if (!r.ok) {
          setErrors(r.fieldErrors ?? {});
          toast.error(r.message);
          return;
        }
        toast.success(`${v.name.trim()} added`);
        onDone();
        router.push(`/customers/${r.data.id}`);
      }
    } catch {
      toast.error("Couldn't reach the server. Your changes are still here — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogContent
      title={customer ? "Edit customer" : "Add customer"}
      description={customer ? undefined : "Shops and contractors who send you orders."}
      footer={
        <>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form={FORM_ID} variant="primary" size="sm" loading={pending}>
            {customer ? "Save changes" : "Add customer"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <fieldset disabled={pending} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Shop / business name" htmlFor="c-name" error={errors.name} className="sm:col-span-2">
            <Input id="c-name" value={v.name} onChange={set("name")} autoComplete="organization" placeholder="e.g. Sri Lakshmi Electricals" />
          </Field>
          <Field label="Contact person" htmlFor="c-contact" error={errors.contactName} optional>
            <Input id="c-contact" value={v.contactName} onChange={set("contactName")} autoComplete="name" />
          </Field>
          <Field label="Phone" htmlFor="c-phone" error={errors.phone} optional>
            <Input id="c-phone" type="tel" value={v.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" placeholder="+91 98xxx xxxxx" className="tnum" />
          </Field>
          <Field label="City" htmlFor="c-city" error={errors.city} optional>
            <Input id="c-city" value={v.city} onChange={set("city")} autoComplete="address-level2" />
          </Field>
          <Field label="Preferred language" htmlFor="c-lang" error={errors.preferredLanguage} hint="Used to read their voice notes and messages.">
            <Select id="c-lang" value={v.preferredLanguage} onChange={set("preferredLanguage")}>
              <option value="AUTO">Auto-detect</option>
              <option value="EN">English</option>
              <option value="TE">Telugu</option>
            </Select>
          </Field>
          <Field label="Notes" htmlFor="c-notes" error={errors.notes} optional className="sm:col-span-2">
            <Textarea id="c-notes" value={v.notes} onChange={set("notes")} className="min-h-20" placeholder="Delivery instructions, credit terms…" />
          </Field>
        </fieldset>
      </form>
    </DialogContent>
  );
}
