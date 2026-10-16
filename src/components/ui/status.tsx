import { cn } from "@/lib/utils";

export const ORDER_STATUS: Record<string, { label: string; className: string; dot: string }> = {
  DRAFT: { label: "Draft", className: "bg-sunken text-ink-2 border-line-strong", dot: "bg-faint" },
  NEEDS_CLARIFICATION: { label: "Needs clarification", className: "bg-warn-soft text-warn border-warn-line", dot: "bg-warn-strong" },
  READY_FOR_REVIEW: { label: "Ready for review", className: "bg-info-soft text-info border-info-line", dot: "bg-info" },
  APPROVED: { label: "Approved", className: "bg-ok-soft text-ok border-ok-line", dot: "bg-ok" },
  REJECTED: { label: "Rejected", className: "bg-bad-soft text-bad border-bad-line", dot: "bg-bad" },
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = ORDER_STATUS[status] ?? ORDER_STATUS.DRAFT;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold", s.className, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}

export const LINE_STATUS: Record<string, { label: string; rail: string; text: string; soft: string }> = {
  CONFIRMED: { label: "Confirmed", rail: "bg-ok", text: "text-ok", soft: "bg-ok-soft" },
  NEEDS_REVIEW: { label: "Needs review", rail: "bg-warn-strong", text: "text-warn", soft: "bg-warn-soft" },
  MISSING_INFO: { label: "Missing info", rail: "bg-bad", text: "text-bad", soft: "bg-bad-soft" },
  UNMATCHED: { label: "Not in catalogue", rail: "bg-bad", text: "text-bad", soft: "bg-bad-soft" },
};

export function Pill({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "info" | "brand"; className?: string }) {
  const tones = {
    neutral: "bg-sunken text-ink-2",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    info: "bg-info-soft text-info",
    brand: "bg-volt-soft text-volt-ink",
  };
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}
