"use client";
import * as React from "react";
import { Copy, Download, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { buildClarification, buildConfirmationText, defaultClarifyLang, type ClarifyLang } from "@/lib/clarify";
import { formatPaise } from "@/lib/money";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { OrderView } from "@/server/orders/view-types";

function waLink(phone: string | null | undefined, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ClarifyDialog({
  open,
  onOpenChange,
  view,
  businessName,
  onRecord,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  view: OrderView;
  businessName: string;
  onRecord: (message: string, status: "COPIED" | "SHARED") => Promise<unknown>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ClarifyContent view={view} businessName={businessName} onRecord={onRecord} />}
    </Dialog>
  );
}

function ClarifyContent({ view, businessName, onRecord }: { view: OrderView; businessName: string; onRecord: (message: string, status: "COPIED" | "SHARED") => Promise<unknown> }) {
  const [lang, setLangState] = React.useState<ClarifyLang>(() => defaultClarifyLang(view));
  const [text, setText] = React.useState(() => buildClarification(view, defaultClarifyLang(view), businessName));
  const setLang = (l: ClarifyLang) => {
    setLangState(l);
    setText(buildClarification(view, l, businessName));
  };
  const openIssues = view.lines.filter((l) => l.status !== "CONFIRMED").length;

  return (
      <DialogContent
        title="Ask the customer"
        description={`Drafted from ${openIssues} unresolved item${openIssues === 1 ? "" : "s"}. Edit freely — nothing is sent until you send it yourself.`}
        className="sm:max-w-xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={async () => {
                if (await copy(text)) {
                  await onRecord(text, "COPIED");
                  toast.success("Message copied", { description: "Paste it into WhatsApp or SMS to send." });
                } else toast.error("Couldn’t access the clipboard — select the text and copy it manually.");
              }}
            >
              <Copy /> Copy message
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                window.open(waLink(view.customer?.phone, text), "_blank", "noopener,noreferrer");
                await onRecord(text, "SHARED");
                toast("WhatsApp opened with this message", { description: "Press send in WhatsApp to deliver it." });
              }}
            >
              <MessageCircle /> Open in WhatsApp
            </Button>
          </>
        }
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div role="radiogroup" aria-label="Message language" className="inline-flex rounded-lg bg-sunken p-1">
            {(
              [
                ["te", "తెలుగు"],
                ["en", "English"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={lang === v}
                onClick={() => setLang(v)}
                className={cn("h-7 rounded-md px-3 text-[13px] font-medium", lang === v ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-muted")}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="truncate text-xs text-muted">To: {view.customer ? `${view.customer.name}${view.customer.phone ? ` · ${view.customer.phone}` : ""}` : "no customer selected"}</span>
        </div>
        <label htmlFor="clarify-text" className="sr-only">
          Clarification message
        </label>
        <Textarea id="clarify-text" value={text} onChange={(e) => setText(e.target.value)} rows={12} className="font-[450]" lang={lang === "te" ? "te" : "en"} />
        {view.clarifications.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Earlier</p>
            <ul className="space-y-1">
              {view.clarifications.slice(0, 4).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{c.message.split("\n").find((l) => /^\d\./.test(l)) ?? c.message.slice(0, 60)}</span>
                  <span className="shrink-0">
                    {c.status === "SHARED" ? "Opened in WhatsApp" : c.status === "COPIED" ? "Copied" : "Saved"} · {formatRelative(c.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
  );
}

export function RejectDialog({ open, onOpenChange, onReject, busy }: { open: boolean; onOpenChange: (o: boolean) => void; onReject: (reason: string) => Promise<boolean>; busy: boolean }) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string>();
  const quick = ["Customer cancelled", "Duplicate order", "Items not supplied by us", "Credit limit exceeded"];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Reject this order"
        description="The order will be closed. The reason is kept in the order history."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (reason.trim().length < 3) return setError("Give a short reason.");
                if (await onReject(reason)) onOpenChange(false);
              }}
            >
              Reject order
            </Button>
          </>
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => setReason(q)} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-line-strong">
              {q}
            </button>
          ))}
        </div>
        <Field label="Reason" htmlFor="reject-reason" error={error}>
          <Textarea id="reject-reason" value={reason} onChange={(e) => (setReason(e.target.value), setError(undefined))} rows={3} />
        </Field>
      </DialogContent>
    </Dialog>
  );
}

export function ApproveDialog({ open, onOpenChange, view, onApprove, busy }: { open: boolean; onOpenChange: (o: boolean) => void; view: OrderView; onApprove: () => Promise<boolean>; busy: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Approve order #${String(view.number).padStart(4, "0")}?`}
        description="Prices are locked at approval. Later catalogue changes won’t alter this order."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="primary" loading={busy} onClick={async () => (await onApprove()) && onOpenChange(false)} autoFocus>
              Approve · {formatPaise(view.totalPaise)}
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
          <dt className="text-muted">Customer</dt>
          <dd className="font-medium">{view.customer?.name}</dd>
          <dt className="text-muted">Items</dt>
          <dd>{view.lines.length} lines</dd>
          <dt className="text-muted">Subtotal</dt>
          <dd className="tnum">{formatPaise(view.subtotalPaise)}</dd>
          {view.taxPaise > 0 && (
            <>
              <dt className="text-muted">{view.taxLabel ?? "Tax"}</dt>
              <dd className="tnum">{formatPaise(view.taxPaise)}</dd>
            </>
          )}
          <dt className="text-muted">Total</dt>
          <dd className="text-base font-semibold tnum">{formatPaise(view.totalPaise)}</dd>
        </dl>
        <p className="mt-4 rounded-lg bg-sunken px-3 py-2 text-xs text-muted">Approving does not send anything to the customer. You can share the confirmation afterwards.</p>
      </DialogContent>
    </Dialog>
  );
}

export function ShareDialog({
  open,
  onOpenChange,
  view,
  businessName,
  onShare,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  view: OrderView;
  businessName: string;
  onShare: (channel: "COPY" | "WHATSAPP" | "PDF") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ShareContent view={view} businessName={businessName} onShare={onShare} />}
    </Dialog>
  );
}

function ShareContent({ view, businessName, onShare }: { view: OrderView; businessName: string; onShare: (channel: "COPY" | "WHATSAPP" | "PDF") => void }) {
  const [text, setText] = React.useState(() => buildConfirmationText(view, businessName, (p) => formatPaise(p)));
  return (
      <DialogContent
        title="Share order confirmation"
        description="Review the message, then copy it or open WhatsApp. Nothing is sent automatically."
        className="sm:max-w-xl"
        footer={
          <>
            <Button asChild variant="ghost">
              <a href={`/api/orders/${view.id}/pdf`} onClick={() => onShare("PDF")}>
                <Download /> PDF
              </a>
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (await copy(text)) {
                  onShare("COPY");
                  toast.success("Confirmation copied");
                } else toast.error("Couldn’t access the clipboard — copy the text manually.");
              }}
            >
              <Copy /> Copy
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                window.open(waLink(view.snapshot?.customer?.phone, text), "_blank", "noopener,noreferrer");
                onShare("WHATSAPP");
                toast("WhatsApp opened", { description: "Attach the PDF there if needed, then press send." });
              }}
            >
              <ExternalLink /> Open in WhatsApp
            </Button>
          </>
        }
      >
        <label htmlFor="share-text" className="sr-only">
          Confirmation message
        </label>
        <Textarea id="share-text" value={text} onChange={(e) => setText(e.target.value)} rows={12} className="font-mono text-[12.5px]" />
      </DialogContent>
  );
}
