"use client";
import * as React from "react";
import { AlertTriangle, FileAudio, FileX2, ImageIcon, Maximize2, MessageSquareText, RefreshCw, RotateCcw, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { OrderView } from "@/server/orders/view-types";

const LANG_LABEL: Record<string, string> = { en: "English", te: "Telugu", mixed: "Telugu + English", other: "Other" };
const STAGE_LABEL: Record<string, string> = {
  STORED: "Queued",
  TRANSCRIBING: "Transcribing",
  EXTRACTING: "Extracting items",
  MATCHING: "Matching catalogue",
  PRICING: "Pricing & checking",
  VALIDATING: "Checking",
  SAVED: "Done",
};

/** Wrap occurrences of `needle` in <mark> so a hovered line is located in the source. */
function highlight(text: string, needle: string | null) {
  if (!needle) return text;
  const n = needle.trim();
  if (n.length < 3) return text;
  const i = text.toLowerCase().indexOf(n.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-volt px-0.5 text-ink transition-colors">{text.slice(i, i + n.length)}</mark>
      {text.slice(i + n.length)}
    </>
  );
}

export function SourcePanel({
  view,
  activeText,
  editable,
  busy,
  onSaveTranscript,
  onReprocess,
  onRetry,
}: {
  view: OrderView;
  activeText: string | null;
  editable: boolean;
  busy: boolean;
  onSaveTranscript: (t: string) => Promise<unknown>;
  onReprocess: (t: string) => Promise<unknown>;
  onRetry: (useRules: boolean) => Promise<unknown>;
}) {
  const [draft, setDraft] = React.useState(view.transcript ?? "");
  const [zoom, setZoom] = React.useState(false);
  const [confirmReprocess, setConfirmReprocess] = React.useState(false);
  const [syncedTranscript, setSyncedTranscript] = React.useState(view.transcript);
  if (syncedTranscript !== view.transcript) {
    setSyncedTranscript(view.transcript);
    setDraft(view.transcript ?? "");
  }
  const job = view.latestJob;
  const running = job && (job.status === "QUEUED" || job.status === "RUNNING");
  const failed = job?.status === "FAILED" && job.errorCode !== "SUPERSEDED";
  const dirty = draft !== (view.transcript ?? "");
  const needsReprocess = dirty || view.transcriptDirty;
  const Icon = view.inputType === "AUDIO" ? FileAudio : view.inputType === "IMAGE" ? ImageIcon : MessageSquareText;
  const sourceLabel = view.inputType === "AUDIO" ? "Voice note" : view.inputType === "IMAGE" ? "Photo of list" : "Message";
  const manualEdits = view.lines.some((l) => l.manuallyEdited);

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <Icon className="size-4 text-brand" /> {sourceLabel}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            {view.detectedLanguage && <span className="rounded bg-sunken px-1.5 py-0.5 font-medium text-ink-2">{LANG_LABEL[view.detectedLanguage] ?? view.detectedLanguage}</span>}
            <span>{formatDateTime(view.createdAt)}</span>
          </div>
        </div>
        <div className="p-4">
          {view.inputType === "TEXT" && (
            <div className="relative max-w-[95%] rounded-2xl rounded-tl-md bg-sunken px-4 py-3 text-[14px] leading-relaxed text-ink">
              <p className="whitespace-pre-wrap break-words" lang={/[ఀ-౿]/.test(view.sourceText ?? "") ? "te" : undefined}>
                {highlight(view.sourceText ?? "", activeText)}
              </p>
              {view.customer && <p className="mt-1.5 text-right text-[11px] text-muted">— {view.customer.contactName ?? view.customer.name}</p>}
            </div>
          )}
          {view.inputType === "AUDIO" &&
            (view.source?.url ? (
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <audio controls preload="metadata" src={view.source.url} className="w-full" aria-label="Original voice note" />
                {view.source.originalName && <p className="mt-2 truncate text-[11px] text-muted">{view.source.originalName}</p>}
              </div>
            ) : (
              <Purged />
            ))}
          {view.inputType === "IMAGE" &&
            (view.source?.url ? (
              <>
                <button type="button" onClick={() => setZoom(true)} className="group relative block w-full overflow-hidden rounded-xl border border-line bg-sunken" aria-label="Enlarge photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={view.source.url} alt="Original order list photo" className="mx-auto max-h-[360px] object-contain" />
                  <span className="absolute right-2 top-2 rounded-md bg-ink/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Maximize2 className="size-4" />
                  </span>
                </button>
                <Dialog open={zoom} onOpenChange={setZoom}>
                  <DialogContent title="Original photo" className="sm:max-w-4xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={view.source.url} alt="Original order list photo, enlarged" className="mx-auto w-full object-contain" />
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <Purged />
            ))}
        </div>
      </Card>

      {running && (
        <Card className="flex items-center gap-3 border-brand-line bg-brand-soft/60 px-4 py-3" aria-live="polite">
          <Spinner className="text-brand" />
          <div>
            <p className="text-[13px] font-semibold text-brand-ink">{STAGE_LABEL[job!.stage] ?? "Processing"}…</p>
            <p className="text-xs text-muted">Line items appear here as soon as processing finishes.</p>
          </div>
        </Card>
      )}

      {failed && (
        <Card role="alert" className="border-bad-line bg-bad-soft/70 px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-bad">
            <AlertTriangle className="size-4" /> Processing didn’t finish
          </p>
          <p className="mt-1 text-[13px] text-ink-2">{job!.errorMessage}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {job!.retryable && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onRetry(false)}>
                <RotateCcw /> Retry
              </Button>
            )}
            {(view.inputType === "TEXT" || job!.kind === "REPROCESS") && job!.provider !== "rules" && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onRetry(true)}>
                <Wand2 /> Use rule-based parser
              </Button>
            )}
            {view.inputType !== "TEXT" && <p className="w-full text-xs text-muted">Or type what the customer asked for in the transcript below and press Process.</p>}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <label htmlFor="transcript" className="text-[13px] font-semibold">
            {view.inputType === "TEXT" ? "Working text" : "Transcript"}
          </label>
          {needsReprocess && <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn">Edited — not yet processed</span>}
        </div>
        <div className="p-3">
          <textarea
            id="transcript"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!editable || busy || !!running}
            rows={Math.min(12, Math.max(4, draft.split("\n").length + 1))}
            placeholder={view.inputType === "TEXT" ? "" : "Type what the customer said, one item per line…"}
            className="w-full resize-y rounded-lg border border-transparent bg-surface-2 px-3 py-2 text-[13.5px] leading-relaxed text-ink outline-none transition-colors hover:border-line focus:border-brand focus:bg-surface focus:ring-3 focus:ring-brand/12 disabled:text-ink-2"
            lang={/[ఀ-౿]/.test(draft) ? "te" : undefined}
          />
          {editable && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted">Correct the wording, then reprocess to rebuild the line items.</p>
              <div className="flex gap-2">
                {dirty && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDraft(view.transcript ?? "")}>
                    Discard
                  </Button>
                )}
                {dirty && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => onSaveTranscript(draft)}>
                    Save
                  </Button>
                )}
                {confirmReprocess ? (
                  <span className="flex items-center gap-1.5 rounded-lg bg-warn-soft px-2 py-1 text-[12px] text-warn">
                    Replace {view.lines.length} line{view.lines.length === 1 ? "" : "s"}
                    {manualEdits ? " (incl. your edits)" : ""}?
                    <Button
                      size="xs"
                      variant="primary"
                      disabled={busy}
                      onClick={async () => {
                        setConfirmReprocess(false);
                        await onReprocess(draft);
                      }}
                    >
                      Reprocess
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setConfirmReprocess(false)}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant={needsReprocess ? "primary" : "secondary"}
                    disabled={busy || !!running || !draft.trim()}
                    onClick={() => (view.lines.length ? setConfirmReprocess(true) : onReprocess(draft))}
                  >
                    <RefreshCw /> {view.lines.length ? "Reprocess" : "Process"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Purged() {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-3 py-4 text-[13px] text-muted")}>
      <FileX2 className="size-4" /> The original file was deleted under the workspace’s retention policy. The transcript is kept.
    </div>
  );
}
