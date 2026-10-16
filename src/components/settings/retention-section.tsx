"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { runPurgeAction, updateRetentionAction } from "@/server/actions/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/field";
import { NETWORK_ERROR, ReadOnlyNote } from "./section-bits";

const OPTIONS = [30, 90, 180, 365];

function daysLabel(d: number) {
  return d === 365 ? "1 year (365 days)" : `${d} days`;
}

export function RetentionSection({ days, canEdit }: { days: number; canEdit: boolean }) {
  const router = useRouter();
  const [value, setValue] = React.useState(days);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [purgeOpen, setPurgeOpen] = React.useState(false);
  const [purging, setPurging] = React.useState(false);
  const options = OPTIONS.includes(days) ? OPTIONS : [...OPTIONS, days].sort((a, b) => a - b);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      const r = await updateRetentionAction(value);
      if (!r.ok) {
        setError(r.message);
        toast.error("Retention not updated", { description: r.message });
        return;
      }
      toast.success(`Original files will be kept for ${daysLabel(value)}`);
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
      toast.error(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  }

  async function purge() {
    setPurging(true);
    try {
      const r = await runPurgeAction();
      if (!r.ok) {
        toast.error("Purge failed", { description: r.message });
        return;
      }
      toast.success(r.data === 0 ? "No expired files to delete" : `Deleted ${r.data} expired ${r.data === 1 ? "file" : "files"}`);
      setPurgeOpen(false);
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setPurging(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Source file retention" description="How long original voice notes and photos are stored after an order is created." />
        <form onSubmit={save} className="flex flex-col gap-4 p-4 sm:p-5">
          {!canEdit && <ReadOnlyNote>Only owners can change data retention.</ReadOnlyNote>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Keep original files for" htmlFor="retention-days" error={error} className="sm:w-64">
              <Select id="retention-days" value={value} onChange={(e) => setValue(Number(e.target.value))} disabled={!canEdit || saving}>
                {options.map((d) => (
                  <option key={d} value={d}>
                    {daysLabel(d)}
                  </option>
                ))}
              </Select>
            </Field>
            {canEdit && (
              <Button type="submit" variant="primary" loading={saving} disabled={value === days}>
                Save
              </Button>
            )}
          </div>
          <div className="rounded-lg bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-ink-2 ring-1 ring-line">
            <p>
              <span className="font-medium text-ink">Kept:</span> orders, transcripts, extracted line items and approval records.
            </p>
            <p className="mt-1">
              <span className="font-medium text-ink">Deleted after the retention period:</span> only the original audio and photo files.
            </p>
          </div>
        </form>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader title="Purge expired files" description="Expired files are removed automatically. Run it now to free up storage immediately." />
          <div className="p-4 sm:p-5">
            <Dialog open={purgeOpen} onOpenChange={(o) => !purging && setPurgeOpen(o)}>
              <DialogTrigger asChild>
                <Button variant="danger">
                  <Trash2 aria-hidden /> Purge expired files now
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Purge expired files?"
                description={`Original audio and photo files older than ${daysLabel(days)} will be permanently deleted. Orders, transcripts and approval records are kept.`}
                footer={
                  <>
                    <DialogClose asChild>
                      <Button variant="ghost" disabled={purging}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button variant="danger" loading={purging} onClick={purge}>
                      Delete expired files
                    </Button>
                  </>
                }
              />
            </Dialog>
          </div>
        </Card>
      )}
    </div>
  );
}
