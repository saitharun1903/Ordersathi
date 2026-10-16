"use client";
import * as React from "react";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * A trigger that asks for confirmation before running an async action.
 * `onConfirm` returns true when it succeeded (closes the dialog).
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  tone = "danger",
  onConfirm,
}: {
  trigger: React.ReactElement;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function confirm() {
    setPending(true);
    try {
      const ok = await onConfirm();
      if (ok) setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={title}
        className="sm:max-w-md"
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant={tone === "danger" ? "danger" : "primary"} size="sm" loading={pending} onClick={confirm}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        <div className="text-sm text-ink-2">{description}</div>
      </DialogContent>
    </Dialog>
  );
}
