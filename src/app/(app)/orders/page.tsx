import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AlertTriangle, FileAudio, ImageIcon, Inbox, MessageSquareText, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePageContext } from "@/server/context";
import { formatPaise } from "@/lib/money";
import { formatRelative, formatDateTime, startOfIstDay } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge } from "@/components/ui/status";
import { InboxFilters } from "@/components/inbox/inbox-filters";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const TABS = [
  { key: "open", label: "Needs action", where: { status: { in: ["DRAFT", "NEEDS_CLARIFICATION", "READY_FOR_REVIEW"] } } },
  { key: "clarify", label: "Needs clarification", where: { status: "NEEDS_CLARIFICATION" } },
  { key: "ready", label: "Ready for review", where: { status: "READY_FOR_REVIEW" } },
  { key: "draft", label: "Drafts", where: { status: "DRAFT" } },
  { key: "approved", label: "Approved", where: { status: "APPROVED" } },
  { key: "rejected", label: "Rejected", where: { status: "REJECTED" } },
  { key: "all", label: "All", where: {} },
] as const satisfies readonly { key: string; label: string; where: Prisma.OrderWhereInput }[];

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);
const TYPE_ICON = { TEXT: MessageSquareText, AUDIO: FileAudio, IMAGE: ImageIcon };
const TYPE_LABEL = { TEXT: "Message", AUDIO: "Voice note", IMAGE: "Photo" };

export default async function OrdersPage(props: PageProps<"/orders">) {
  const ctx = await requirePageContext();
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const tabKey = one("tab") || "open";
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0];
  const q = one("q").trim();
  const type = one("type");
  const customer = one("customer");
  const range = one("range");

  const base: Prisma.OrderWhereInput = { workspaceId: ctx.workspaceId };
  const filters: Prisma.OrderWhereInput[] = [];
  if (type === "TEXT" || type === "AUDIO" || type === "IMAGE") filters.push({ inputType: type });
  if (customer) filters.push({ customerId: customer });
  if (range === "today") filters.push({ createdAt: { gte: startOfIstDay() } });
  if (range === "7d") filters.push({ createdAt: { gte: daysAgo(7) } });
  if (range === "30d") filters.push({ createdAt: { gte: daysAgo(30) } });
  if (q) {
    const n = Number(q.replace(/^#/, ""));
    filters.push({
      OR: [
        ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { transcript: { contains: q, mode: "insensitive" } },
        { lines: { some: { product: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }
  const filtered: Prisma.OrderWhereInput = { ...base, AND: filters };

  const [orders, counts, customers] = await Promise.all([
    prisma.order.findMany({
      where: { ...filtered, ...tab.where },
      include: {
        customer: { select: { name: true, city: true } },
        _count: { select: { lines: true } },
        lines: { where: { status: { not: "CONFIRMED" } }, select: { id: true } },
        jobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    Promise.all(TABS.map((t) => prisma.order.count({ where: { ...filtered, ...t.where } }))),
    prisma.customer.findMany({ where: { workspaceId: ctx.workspaceId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const href = (k: string) => {
    const p = new URLSearchParams();
    for (const [key, v] of Object.entries(sp)) if (typeof v === "string" && v && key !== "tab") p.set(key, v);
    if (k !== "open") p.set("tab", k);
    const s = p.toString();
    return `/orders${s ? `?${s}` : ""}`;
  };
  const hasFilters = !!(q || type || customer || range);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order from messages, voice notes and photos — newest first."
        actions={
          <Button asChild variant="primary">
            <Link href="/orders/new">
              <Plus /> New order
            </Link>
          </Button>
        }
      />
      <nav aria-label="Order status" className="-mx-4 mb-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {TABS.map((t, i) => {
            const active = t.key === tab.key;
            return (
              <li key={t.key}>
                <Link
                  href={href(t.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-1.5 px-3 text-[13px] font-medium transition-colors",
                    active ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {t.label}
                  <span className={cn("rounded-full px-1.5 text-[11px] tnum", active ? "bg-ink text-white" : "bg-sunken text-muted")}>{counts[i]}</span>
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <InboxFilters customers={customers} />

      <Card className="mt-3 overflow-hidden">
        {orders.length === 0 ? (
          <EmptyState
            icon={<Inbox />}
            title={hasFilters ? "No orders match these filters" : tab.key === "open" ? "You’re all caught up" : "No orders here yet"}
            description={hasFilters ? "Try clearing the search or filters." : tab.key === "open" ? "New orders that need review will appear here." : "Orders will show up here as you process them."}
            action={
              !hasFilters && (
                <Button asChild variant="primary">
                  <Link href="/orders/new">
                    <Plus /> New order
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-[13px] md:table">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Input</th>
                  <th className="px-3 py-2.5 font-medium">Received</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium">Items</th>
                  <th className="px-4 py-2.5 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const Icon = TYPE_ICON[o.inputType];
                  const failed = o.jobs[0]?.status === "FAILED" && o._count.lines === 0;
                  return (
                    <tr key={o.id} className="group relative border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${o.id}`} className="font-mono text-[12.5px] font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none group-focus-within:underline">
                          #{String(o.number).padStart(4, "0")}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        {o.customer ? (
                          <>
                            <span className="font-medium">{o.customer.name}</span>
                            {o.customer.city && <span className="block text-[11px] text-muted">{o.customer.city}</span>}
                          </>
                        ) : (
                          <span className="text-warn">No customer</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon className="size-3.5" /> {TYPE_LABEL[o.inputType]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted" title={formatDateTime(o.createdAt)}>
                        {formatRelative(o.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={o.status} />
                          {failed && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bad">
                              <AlertTriangle className="size-3" /> Processing failed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tnum">
                        {o._count.lines}
                        {o.lines.length > 0 && o.status !== "APPROVED" && o.status !== "REJECTED" && <span className="ml-1.5 rounded bg-warn-soft px-1 text-[11px] font-semibold text-warn">{o.lines.length} open</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tnum">{o.totalPaise ? formatPaise(o.totalPaise) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {orders.map((o) => {
                const Icon = TYPE_ICON[o.inputType];
                return (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="block px-4 py-3 active:bg-surface-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold">{o.customer?.name ?? <span className="text-warn">No customer</span>}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                            <span className="font-mono">#{String(o.number).padStart(4, "0")}</span>· <Icon className="size-3" /> {TYPE_LABEL[o.inputType]} · {formatRelative(o.createdAt)}
                          </p>
                        </div>
                        <p className="shrink-0 text-[14px] font-semibold tnum">{o.totalPaise ? formatPaise(o.totalPaise) : "—"}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <OrderStatusBadge status={o.status} />
                        {o.lines.length > 0 && o.status !== "APPROVED" && o.status !== "REJECTED" && <span className="text-[11px] font-medium text-warn">{o.lines.length} item{o.lines.length === 1 ? "" : "s"} to resolve</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
