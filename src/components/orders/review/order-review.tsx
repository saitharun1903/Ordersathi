"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, ChevronDown, Download, FileAudio, ImageIcon, Lock, MessageCircleQuestion, MessageSquareText, Plus, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatPaise, formatQty } from "@/lib/money";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { unitLabel } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/ui/status";
import { Tip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addLineAction,
  approveAction,
  recordClarificationAction,
  recordShareAction,
  rejectAction,
  removeLineAction,
  reopenAction,
  reprocessAction,
  retryJobAction,
  saveTranscriptAction,
  setCustomerAction,
  updateLineAction,
} from "@/server/actions/orders";
import type { OrderView } from "@/server/orders/view-types";
import { useOrder } from "./use-order";
import { LineCard, type LinePatch } from "./line-card";
import { SourcePanel } from "./source-panel";
import { ProductPicker } from "./product-picker";
import { ApproveDialog, ClarifyDialog, RejectDialog, ShareDialog } from "./dialogs";

type Customer = { id: string; name: string; city: string | null };

export function OrderReview({ initial, customers, businessName, role }: { initial: OrderView; customers: Customer[]; businessName: string; role: Role }) {
  const { view, pending, mutate } = useOrder(initial);
  const [activeLine, setActiveLine] = React.useState<string | null>(null);
  const [picker, setPicker] = React.useState<{ lineId: string | null; query: string } | null>(null);
  const [dialog, setDialog] = React.useState<null | "clarify" | "reject" | "approve" | "share">(null);
  const [tab, setTab] = React.useState("order");
  const [justApproved, setJustApproved] = React.useState(false);

  const closed = view.status === "APPROVED" || view.status === "REJECTED";
  const editable = view.permissions.canEdit && !closed;
  const running = !!view.latestJob && (view.latestJob.status === "QUEUED" || view.latestJob.status === "RUNNING");
  const openLines = view.lines.filter((l) => l.status !== "CONFIRMED");
  const canApproveNow = view.permissions.canApprove && view.status === "READY_FOR_REVIEW" && view.blockers.length === 0;
  const num = `#${String(view.number).padStart(4, "0")}`;

  const patchLine = (lineId: string, patch: LinePatch) => mutate(`line:${lineId}`, (v) => updateLineAction(v.id, v.version, lineId, patch));

  const jumpToIssue = React.useCallback(
    (dir: 1 | -1) => {
      const issues = view.lines.filter((l) => l.status !== "CONFIRMED");
      if (!issues.length) return;
      const idx = issues.findIndex((l) => l.id === activeLine);
      const next = issues[(idx + dir + issues.length) % issues.length];
      setTab("order");
      setActiveLine(next.id);
      document.getElementById(`line-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [view.lines, activeLine],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable || dialog || picker) return;
      if (e.key === "j") jumpToIssue(1);
      if (e.key === "k") jumpToIssue(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jumpToIssue, dialog, picker]);

  const activeText = view.lines.find((l) => l.id === activeLine)?.originalText ?? null;

  const header = (
    <div className="mb-4 flex flex-col gap-3 lg:mb-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <Link href="/orders" className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> Orders
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-[-0.035em] sm:text-[28px]">Order {num}</h1>
          <OrderStatusBadge status={view.status} />
          {view.isDemo && <span className="rounded bg-volt px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-ink">Demo data</span>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1">
            {view.inputType === "AUDIO" ? <FileAudio className="size-3.5" /> : view.inputType === "IMAGE" ? <ImageIcon className="size-3.5" /> : <MessageSquareText className="size-3.5" />}
            {view.inputType === "AUDIO" ? "Voice note" : view.inputType === "IMAGE" ? "Photo" : "Message"}
          </span>
          <span>Received {formatRelative(view.createdAt)}</span>
          {view.createdByName && <span>by {view.createdByName}</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!closed && (
          <>
            <CustomerSelect view={view} customers={customers} disabled={!editable || pending !== null} onChange={(id) => mutate("customer", (v) => setCustomerAction(v.id, v.version, id))} />
            {editable && (
              <Button variant={openLines.length ? "warn" : "secondary"} onClick={() => setDialog("clarify")} disabled={!openLines.length}>
                <MessageCircleQuestion /> Ask customer
              </Button>
            )}
            {view.permissions.canApprove && (
              <Button variant="ghost" onClick={() => setDialog("reject")} className="text-muted hover:text-bad">
                <Ban /> Reject
              </Button>
            )}
          </>
        )}
        {view.status === "APPROVED" && (
          <>
            <Button asChild variant="secondary">
              <a href={`/api/orders/${view.id}/pdf`}>
                <Download /> Order confirmation PDF
              </a>
            </Button>
            <Button variant="primary" onClick={() => setDialog("share")}>
              <Share2 /> Share
            </Button>
          </>
        )}
        {view.status === "REJECTED" && view.permissions.canApprove && (
          <Button variant="secondary" loading={pending === "reopen"} onClick={() => mutate("reopen", (v) => reopenAction(v.id, v.version))}>
            <RotateCcw /> Reopen as draft
          </Button>
        )}
      </div>
    </div>
  );

  const summary = (
    <ProgressStrip view={view} onNext={() => jumpToIssue(1)} />
  );

  const linesPanel = (
    <div className="space-y-3">
      {view.status === "APPROVED" && view.snapshot ? (
        <ApprovedLines view={view} justApproved={justApproved} />
      ) : (
        <>
          {view.status === "REJECTED" && (
            <Card className="border-bad-line bg-bad-soft/60 px-4 py-3 text-[13px]">
              <p className="font-semibold text-bad">Rejected{view.rejectedByName ? ` by ${view.rejectedByName}` : ""}</p>
              <p className="mt-0.5 text-ink-2">{view.rejectionReason}</p>
              {view.rejectedAt && <p className="mt-1 text-xs text-muted">{formatDateTime(view.rejectedAt)}</p>}
            </Card>
          )}
          {view.lines.length === 0 && !running ? (
            <Card>
              <EmptyState
                title={view.latestJob?.status === "FAILED" ? "No line items yet" : "Nothing extracted"}
                description={
                  view.latestJob?.status === "FAILED"
                    ? "Processing didn’t complete. Retry, type the transcript, or add items manually."
                    : "No order items were found in the source. Add items manually or edit the transcript and reprocess."
                }
                action={
                  editable && (
                    <Button variant="secondary" onClick={() => setPicker({ lineId: null, query: "" })}>
                      <Plus /> Add line
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <ol className="space-y-2.5" aria-label="Line items">
              {running && view.lines.length === 0
                ? [0, 1, 2].map((i) => <li key={i} className="h-24 animate-pulse-soft rounded-xl border border-line bg-surface" />)
                : view.lines.map((line, i) => (
                    <LineCard
                      key={line.id}
                      line={line}
                      index={i}
                      editable={editable && !running}
                      busy={pending === `line:${line.id}`}
                      active={activeLine === line.id}
                      onActivate={setActiveLine}
                      onPatch={(p) => patchLine(line.id, p)}
                      onRemove={() => mutate(`line:${line.id}`, (v) => removeLineAction(v.id, v.version, line.id))}
                      onSearch={() => setPicker({ lineId: line.id, query: line.description ?? line.originalText })}
                    />
                  ))}
            </ol>
          )}
          {editable && view.lines.length > 0 && (
            <button
              type="button"
              onClick={() => setPicker({ lineId: null, query: "" })}
              disabled={running}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-3 text-[13px] font-medium text-muted transition-colors hover:border-brand hover:bg-brand-soft/50 hover:text-brand-ink"
            >
              <Plus className="size-4" /> Add line from catalogue
            </button>
          )}
          {view.lines.length > 0 && <Totals view={view} />}
        </>
      )}
    </div>
  );

  const source = (
    <div className="space-y-3">
      <SourcePanel
        view={view}
        activeText={activeText}
        editable={editable}
        busy={pending !== null}
        onSaveTranscript={(t) => mutate("transcript", (v) => saveTranscriptAction(v.id, v.version, t))}
        onReprocess={(t) => mutate("reprocess", (v) => reprocessAction(v.id, v.version, t))}
        onRetry={(useRules) => mutate("retry", (v) => retryJobAction(v.id, v.latestJob!.id, useRules))}
      />
      <Timeline view={view} />
    </div>
  );

  return (
    <div className="pb-24 lg:pb-20">
      {header}
      {summary}

      {/* Mobile: switch between order and source; desktop: side by side. Rendered once. */}
      <div role="tablist" aria-label="Order view" className="mb-3 flex w-full gap-1 rounded-lg bg-sunken p-1 lg:hidden">
        {(
          [
            ["order", "Order"],
            ["source", "Source & transcript"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors",
              tab === key ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-muted hover:text-ink",
            )}
          >
            {label}
            {key === "order" && openLines.length > 0 && !closed && <span className="rounded-full bg-warn-soft px-1.5 text-[11px] font-semibold text-warn">{openLines.length}</span>}
          </button>
        ))}
      </div>
      <div className="gap-5 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
        <div id="panel-source" role="tabpanel" aria-labelledby="tab-source" className={cn("lg:sticky lg:top-5 lg:block lg:max-h-[calc(100dvh-2.5rem)] lg:self-start lg:overflow-y-auto lg:pb-2 lg:pr-1", tab === "source" ? "block" : "hidden")}>
          {source}
        </div>
        <div id="panel-order" role="tabpanel" aria-labelledby="tab-order" className={cn("lg:block", tab === "order" ? "block" : "hidden")}>
          {linesPanel}
        </div>
      </div>

      {/* Sticky approval bar */}
      {!closed && (
        <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:bottom-0 lg:left-[240px]">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 lg:px-4">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">{view.blockers.length ? "Estimated total" : "Total"}</p>
              <p className="font-display text-[22px] font-bold leading-tight tracking-[-0.03em] tnum">{formatPaise(view.totalPaise)}</p>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <p className="hidden truncate text-[13px] text-muted md:block">
                {view.blockers.length ? view.blockers.join(" · ") : view.permissions.canApprove ? "All items confirmed — ready to approve." : "Ready — waiting for a manager to approve."}
              </p>
              {view.permissions.canApprove ? (
                <Tip content={view.blockers.length ? `To approve: ${view.blockers.join("; ")}` : null}>
                  <span tabIndex={canApproveNow ? -1 : 0}>
                    <Button variant="volt" size="lg" disabled={!canApproveNow || pending !== null} onClick={() => setDialog("approve")}>
                      <CheckCircle2 /> Approve
                    </Button>
                  </span>
                </Tip>
              ) : (
                <span className="flex items-center gap-1.5 rounded-lg bg-sunken px-3 py-2 text-[13px] text-muted">
                  <Lock className="size-3.5" /> {role === "OPERATOR" ? "Managers approve orders" : "Approval restricted"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <ProductPicker
        open={!!picker}
        onOpenChange={(o) => !o && setPicker(null)}
        initialQuery={picker?.query ?? ""}
        customerId={view.customer?.id ?? null}
        title={picker?.lineId ? "Choose the exact product" : "Add a line"}
        onPick={async (p) => {
          const target = picker;
          setPicker(null);
          if (target?.lineId) await patchLine(target.lineId, { productId: p.id });
          else {
            const r = await mutate("add", (v) => addLineAction(v.id, v.version, { productId: p.id }));
            if (r.ok) toast.success(`${p.name} added`, { description: "Enter the quantity." });
          }
        }}
      />
      <ClarifyDialog open={dialog === "clarify"} onOpenChange={(o) => setDialog(o ? "clarify" : null)} view={view} businessName={businessName} onRecord={(m, s) => mutate("clarify", (v) => recordClarificationAction(v.id, m, s))} />
      <RejectDialog
        open={dialog === "reject"}
        onOpenChange={(o) => setDialog(o ? "reject" : null)}
        busy={pending === "reject"}
        onReject={async (reason) => {
          const r = await mutate("reject", (v) => rejectAction(v.id, v.version, reason));
          if (r.ok) toast("Order rejected");
          return r.ok;
        }}
      />
      <ApproveDialog
        open={dialog === "approve"}
        onOpenChange={(o) => setDialog(o ? "approve" : null)}
        view={view}
        busy={pending === "approve"}
        onApprove={async () => {
          const r = await mutate(
            "approve",
            (v) => approveAction(v.id, v.version),
            (d) => d.view,
          );
          if (r.ok) {
            setJustApproved(true);
            toast.success(r.data.alreadyApproved ? "This order was already approved" : `Order ${num} approved`, { description: "Prices are locked. Share the confirmation when ready." });
          }
          return r.ok;
        }}
      />
      <ShareDialog open={dialog === "share"} onOpenChange={(o) => setDialog(o ? "share" : null)} view={view} businessName={businessName} onShare={(c) => void recordShareAction(view.id, c)} />
    </div>
  );
}

function CustomerSelect({ view, customers, disabled, onChange }: { view: OrderView; customers: Customer[]; disabled: boolean; onChange: (id: string | null) => void }) {
  const missing = !view.customer;
  return (
    <div className="relative">
      <label htmlFor="order-customer" className="sr-only">
        Customer
      </label>
      <select
        id="order-customer"
        value={view.customer?.id ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "h-9 max-w-[16rem] appearance-none truncate rounded-lg border bg-surface pl-3 pr-8 text-[13px] font-medium outline-none focus:border-brand focus:ring-3 focus:ring-brand/12 disabled:opacity-100",
          missing ? "border-warn-strong text-warn" : "border-line-strong text-ink",
        )}
      >
        <option value="">Select customer…</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

function ProgressStrip({ view, onNext }: { view: OrderView; onNext: () => void }) {
  const total = view.lines.length;
  if (!total || view.status === "APPROVED") return null;
  const { confirmed, review, missing, unmatched } = view.counts;
  const seg = (n: number, cls: string, label: string) =>
    n > 0 && <div className={cn("h-full transition-[width] duration-300", cls)} style={{ width: `${(n / total) * 100}%` }} title={`${n} ${label}`} />;
  const open = total - confirmed;
  return (
    <Card className="mb-4 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center lg:mb-5">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <span className="font-semibold">
            {open === 0 ? "All items confirmed" : `${open} of ${total} item${total === 1 ? "" : "s"} need${open === 1 ? "s" : ""} attention`}
          </span>
          <Legend cls="bg-ok" n={confirmed} label="confirmed" />
          <Legend cls="bg-warn-strong" n={review} label="to review" />
          <Legend cls="bg-bad" n={missing + unmatched} label="missing / not found" />
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
          {seg(confirmed, "bg-ok", "confirmed")}
          {seg(review, "bg-warn-strong", "to review")}
          {seg(missing + unmatched, "bg-bad", "missing")}
        </div>
      </div>
      {open > 0 && (
        <Button size="sm" variant="secondary" onClick={onNext} className="self-start sm:self-auto">
          Next issue <kbd className="rounded border border-line px-1 font-mono text-[10px] text-muted">J</kbd>
        </Button>
      )}
    </Card>
  );
}

function Legend({ cls, n, label }: { cls: string; n: number; label: string }) {
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className={cn("size-2 rounded-full", cls)} />
      <span className="tnum">{n}</span> {label}
    </span>
  );
}

function Totals({ view }: { view: OrderView }) {
  const unpriced = view.lines.filter((l) => l.lineTotalPaise === null).length;
  return (
    <Card className="px-4 py-3 sm:px-5">
      <dl className="ml-auto max-w-xs space-y-1 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tnum">{formatPaise(view.subtotalPaise)}</dd>
        </div>
        {view.taxPaise > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">{view.taxLabel ?? "Tax"}</dt>
            <dd className="tnum">{formatPaise(view.taxPaise)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-1.5 text-[15px] font-semibold">
          <dt>Total</dt>
          <dd className="tnum">{formatPaise(view.totalPaise)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-right text-[11px] text-muted">
        {unpriced > 0 ? `${unpriced} line${unpriced === 1 ? " is" : "s are"} not priced yet. ` : ""}
        {view.taxPaise ? "" : "No tax configured. "}Prices from your catalogue; calculated on the server.
      </p>
    </Card>
  );
}

function ApprovedLines({ view, justApproved }: { view: OrderView; justApproved: boolean }) {
  const s = view.snapshot!;
  return (
    <Card className={cn("overflow-hidden", justApproved && "animate-slide-up")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-line bg-brand-soft/70 px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-brand-ink">
          <CheckCircle2 className="size-4" /> Approved by {s.approvedBy.name} · {formatDateTime(s.approvedAt)}
        </p>
        <p className="flex items-center gap-1 text-xs text-brand-ink/80">
          <Lock className="size-3" /> Prices locked at approval
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
              <th className="px-4 py-2 font-medium sm:px-5">Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-4 py-2 text-right font-medium sm:px-5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 sm:px-5">
                  <p className="font-medium">{l.name}</p>
                  <p className="text-[11px] text-muted">
                    <span className="font-mono">{l.sku}</span> · “{l.originalText}”
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tnum">
                  {formatQty(l.sellQuantity)} {unitLabel(l.sellingUnit, Number(l.sellQuantity))}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tnum">
                  {formatPaise(l.unitPricePaise)}
                  {l.priceSource === "CUSTOMER" && <span className="block text-[10px] font-medium uppercase text-brand">customer</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tnum sm:px-5">{formatPaise(l.lineTotalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line bg-surface-2 px-4 py-3 sm:px-5">
        <dl className="ml-auto max-w-xs space-y-1 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tnum">{formatPaise(s.subtotalPaise)}</dd>
          </div>
          {s.taxPaise > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">{s.taxLabel ?? "Tax"}</dt>
              <dd className="tnum">{formatPaise(s.taxPaise)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-1.5 text-[15px] font-semibold">
            <dt>Approved total</dt>
            <dd className="tnum">{formatPaise(s.totalPaise)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

const EVENT_LABEL: Record<string, string> = {
  "order.created": "Order received",
  "order.processed": "Draft prepared",
  "order.reprocessed": "Reprocessed from edited transcript",
  "order.processing_failed": "Processing failed",
  "order.retry": "Processing retried",
  "order.reprocess_requested": "Reprocessing requested",
  "order.transcript_edited": "Transcript edited",
  "order.customer_set": "Customer set",
  "line.updated": "Line updated",
  "line.added": "Line added",
  "line.removed": "Line removed",
  "order.approved": "Approved",
  "order.rejected": "Rejected",
  "order.reopened": "Reopened",
  "clarification.copied": "Clarification copied",
  "clarification.opened_in_whatsapp": "Clarification opened in WhatsApp",
  "clarification.saved": "Clarification saved",
  "confirmation.pdf": "Confirmation PDF downloaded",
  "confirmation.copy": "Confirmation copied",
  "confirmation.whatsapp": "Confirmation opened in WhatsApp",
};

function Timeline({ view }: { view: OrderView }) {
  const [open, setOpen] = React.useState(false);
  const events = open ? view.timeline : view.timeline.slice(0, 4);
  if (!view.timeline.length) return null;
  return (
    <Card className="px-4 py-3">
      <p className="mb-2 text-[13px] font-semibold">Activity</p>
      <ol className="relative space-y-2.5 border-l border-line pl-4">
        {events.map((e) => (
          <li key={e.id} className="relative text-[12.5px]">
            <span className={cn("absolute -left-[21px] top-1.5 size-2 rounded-full ring-2 ring-surface", e.type === "order.approved" ? "bg-ok" : e.type.includes("fail") || e.type === "order.rejected" ? "bg-bad" : "bg-line-strong")} />
            <span className="font-medium text-ink">{EVENT_LABEL[e.type] ?? e.type}</span>
            <span className="text-muted">
              {" "}
              · {e.actorName ?? "System"} · {formatRelative(e.createdAt)}
            </span>
          </li>
        ))}
      </ol>
      {view.timeline.length > 4 && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-xs font-medium text-brand hover:underline">
          {open ? "Show less" : `Show all ${view.timeline.length}`}
        </button>
      )}
    </Card>
  );
}
