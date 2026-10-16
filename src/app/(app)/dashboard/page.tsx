import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, ClipboardCheck, FileAudio, ImageIcon, Inbox, MessageSquareText, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePageContext } from "@/server/context";
import { formatPaise, formatPaiseShort } from "@/lib/money";
import { formatRelative, istDayKey, startOfIstDay } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge } from "@/components/ui/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
] as const;

const EVENT_TEXT: Record<string, string> = {
  "order.created": "received",
  "order.processed": "draft prepared",
  "order.approved": "approved",
  "order.rejected": "rejected",
  "order.processing_failed": "processing failed",
  "clarification.copied": "clarification copied",
  "clarification.opened_in_whatsapp": "clarification opened in WhatsApp",
  "order.reprocessed": "reprocessed",
  "confirmation.pdf": "confirmation PDF downloaded",
  "confirmation.whatsapp": "confirmation opened in WhatsApp",
};

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const ctx = await requirePageContext();
  const sp = await props.searchParams;
  const period = PERIODS.find((p) => p.key === sp.period)?.key ?? "7d";
  const since = period === "today" ? startOfIstDay() : new Date(startOfIstDay().getTime() - (period === "7d" ? 6 : 29) * 86400_000);
  const ws = ctx.workspaceId;
  const open = { in: ["DRAFT", "NEEDS_CLARIFICATION", "READY_FOR_REVIEW"] as ("DRAFT" | "NEEDS_CLARIFICATION" | "READY_FOR_REVIEW")[] };

  const [awaiting, ready, approvedAgg, unresolved, attention, events, chartOrders, productCount] = await Promise.all([
    prisma.order.count({ where: { workspaceId: ws, status: open } }),
    prisma.order.count({ where: { workspaceId: ws, status: "READY_FOR_REVIEW" } }),
    prisma.order.aggregate({ where: { workspaceId: ws, status: "APPROVED", approvedAt: { gte: since } }, _sum: { totalPaise: true }, _count: true }),
    prisma.orderLine.count({ where: { status: { not: "CONFIRMED" }, order: { workspaceId: ws, status: open } } }),
    prisma.order.findMany({
      where: { workspaceId: ws, status: open },
      include: { customer: { select: { name: true } }, lines: { where: { status: { not: "CONFIRMED" } }, select: { id: true } }, jobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.auditEvent.findMany({
      where: { workspaceId: ws, orderId: { not: null }, type: { in: Object.keys(EVENT_TEXT) } },
      include: { order: { select: { number: true, customer: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.order.findMany({
      where: { workspaceId: ws, status: "APPROVED", approvedAt: { gte: new Date(startOfIstDay().getTime() - 13 * 86400_000) } },
      select: { approvedAt: true, totalPaise: true },
    }),
    prisma.product.count({ where: { workspaceId: ws, archivedAt: null } }),
  ]);

  // 14-day approved value by IST day
  const days = Array.from({ length: 14 }, (_, i) => istDayKey(new Date(startOfIstDay().getTime() - (13 - i) * 86400_000 + 3600_000)));
  const byDay = new Map(days.map((d) => [d, 0]));
  for (const o of chartOrders) {
    const k = istDayKey(o.approvedAt!);
    if (byDay.has(k)) byDay.set(k, byDay.get(k)! + o.totalPaise);
  }
  const max = Math.max(1, ...byDay.values());
  const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            {greeting}, {ctx.userName.split(" ")[0]}
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.035em] sm:text-[32px]">{ctx.workspaceName}</h1>
        </div>
        <Button asChild variant="primary" size="lg">
          <Link href="/orders/new">
            <Plus /> New order
          </Link>
        </Button>
      </div>

      {productCount === 0 && (
        <Card className="flex flex-col gap-3 border-warn-line bg-warn-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-warn">
            <span className="font-semibold">Your catalogue is empty.</span> OrderSathi only matches products that exist in your catalogue.
          </p>
          <Button asChild size="sm" variant="secondary">
            <Link href="/catalogue/import">Import catalogue</Link>
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-line [gap:1px] lg:grid-cols-4">
        <Kpi href="/orders" icon={<Inbox />} label="Awaiting review" value={String(awaiting)} hint={`${ready} ready to approve`} tone={awaiting ? "warn" : "neutral"} />
        <Kpi href="/orders?tab=ready" icon={<ClipboardCheck />} label="Ready to approve" value={String(ready)} hint="All items confirmed" />
        <Kpi href="/orders?tab=clarify" icon={<CircleAlert />} label="Unresolved line items" value={String(unresolved)} hint="Across open orders" tone={unresolved ? "warn" : "neutral"} />
        <div className="relative bg-night p-4 text-white sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-white/60">Approved order value</p>
            <CheckCircle2 className="size-4 text-volt" />
          </div>
          <p className="mt-2 font-display text-[30px] font-bold leading-none tracking-[-0.04em] text-volt tnum sm:text-[36px]" title={formatPaise(approvedAgg._sum.totalPaise ?? 0)}>
            {formatPaiseShort(approvedAgg._sum.totalPaise ?? 0)}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/50">
              {approvedAgg._count} order{approvedAgg._count === 1 ? "" : "s"} · not payments
            </p>
            <nav aria-label="Period" className="flex rounded-md bg-white/10 p-0.5">
              {PERIODS.map((p) => (
                <Link key={p.key} href={`/dashboard?period=${p.key}`} aria-current={p.key === period ? "true" : undefined} className={cn("rounded px-1.5 py-0.5 font-mono text-[11px] font-medium", p.key === period ? "bg-white text-ink" : "text-white/60 hover:text-white")}>
                  {p.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader
            title="Needs your attention"
            description="Oldest first — clear these before the day ends."
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link href="/orders">
                  All orders <ArrowRight />
                </Link>
              </Button>
            }
          />
          {attention.length === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title="Nothing waiting" description="Every order has been reviewed. New orders will appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((o) => {
                const Icon = o.inputType === "AUDIO" ? FileAudio : o.inputType === "IMAGE" ? ImageIcon : MessageSquareText;
                const failed = o.jobs[0]?.status === "FAILED";
                return (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 sm:px-5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface-2 text-ink-2">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">
                          {o.customer?.name ?? <span className="text-warn">Customer not set</span>}
                          <span className="ml-2 font-mono text-[11px] text-muted">#{String(o.number).padStart(4, "0")}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {formatRelative(o.createdAt)}
                          {failed ? " · processing failed" : o.lines.length ? ` · ${o.lines.length} item${o.lines.length === 1 ? "" : "s"} to resolve` : ""}
                        </p>
                      </div>
                      <OrderStatusBadge status={o.status} className="hidden sm:inline-flex" />
                      <span className="min-w-[84px] text-right text-[13.5px] font-semibold tnum">{o.totalPaise ? formatPaise(o.totalPaise) : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Approved order value" description="Last 14 days, by approval date (IST). Not revenue or collections." />
            <div className="px-4 pb-4 pt-3 sm:px-5">
              <div className="flex h-32 items-end gap-1.5" role="img" aria-label="Bar chart of approved order value over the last 14 days">
                {days.map((d, i) => {
                  const v = byDay.get(d)!;
                  const today = i === days.length - 1;
                  return (
                    <div key={d} className="group relative flex h-full flex-1 flex-col justify-end">
                      <div
                        className={cn("rounded-[3px] transition-colors", v ? (today ? "bg-volt ring-1 ring-inset ring-ink/15" : "bg-ink group-hover:bg-ink-2") : "bg-sunken")}
                        style={{ height: v ? `${Math.max(6, (v / max) * 100)}%` : "3px" }}
                      />
                      <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                        {d.slice(8)}/{d.slice(5, 7)} · {formatPaiseShort(v)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
                <span>{days[0].slice(8)}/{days[0].slice(5, 7)}</span>
                <span>Today</span>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Recent activity" />
            {events.length === 0 ? (
              <EmptyState title="No activity yet" description="Process your first order to see it here." />
            ) : (
              <ul className="space-y-0 px-4 py-2 sm:px-5">
                {events.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
                    <Link href={`/orders/${e.orderId}`} className="min-w-0 truncate hover:underline">
                      <span className="font-mono text-[12px] font-medium">#{String(e.order?.number ?? 0).padStart(4, "0")}</span>
                      <span className="text-muted"> {e.order?.customer?.name ? `· ${e.order.customer.name} ` : ""}</span>
                      <span className={cn(e.type === "order.approved" ? "text-ok" : e.type.includes("fail") || e.type === "order.rejected" ? "text-bad" : "text-ink-2")}>{EVENT_TEXT[e.type]}</span>
                    </Link>
                    <span className="shrink-0 text-[11px] text-muted">{formatRelative(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ href, icon, label, value, hint, tone = "neutral" }: { href: string; icon: React.ReactNode; label: string; value: string; hint: string; tone?: "neutral" | "warn" }) {
  return (
    <Link href={href} className="group relative bg-surface p-4 transition-colors hover:bg-surface-2 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className={cn("[&_svg]:size-4", tone === "warn" ? "text-warn-strong" : "text-faint")}>{icon}</span>
      </div>
      <p className="mt-2 flex items-baseline gap-2 font-display text-[30px] font-bold leading-none tracking-[-0.04em] tnum sm:text-[36px]">
        {value}
        {tone === "warn" && <span className="size-2 -translate-y-1 rounded-full bg-warn-strong" aria-hidden />}
      </p>
      <p className="mt-3 flex items-center gap-1 text-xs text-muted">
        {hint}
        <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
    </Link>
  );
}
