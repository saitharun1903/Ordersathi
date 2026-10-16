import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, SearchX, Users } from "lucide-react";
import { requirePageContext } from "@/server/context";
import { can } from "@/server/permissions";
import { listCustomers } from "@/server/customers/service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { LanguagePill } from "@/components/customers/language-pill";
import { AddCustomerButton } from "@/components/customers/customer-actions";
import { formatPaise } from "@/lib/money";
import { formatRelative } from "@/lib/dates";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage(props: PageProps<"/customers">) {
  const ctx = await requirePageContext();
  const sp = await props.searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const canManage = can(ctx.role, "customer.manage");
  const customers = await listCustomers(ctx, q || undefined);

  return (
    <>
      <PageHeader
        title="Customers"
        description={q ? undefined : customers.length ? pluralize(customers.length, "customer") : "Shops and contractors who send you orders."}
        actions={canManage ? <AddCustomerButton /> : undefined}
      />

      {(customers.length > 0 || q) && (
        <form method="get" action="/customers" role="search" className="mb-4 flex gap-2 sm:max-w-md">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <label htmlFor="cust-q" className="sr-only">
              Search customers
            </label>
            <Input id="cust-q" name="q" type="search" defaultValue={q} placeholder="Search name, contact, phone or city" className="pl-9" />
          </div>
          <Button type="submit">Search</Button>
        </form>
      )}

      {q && customers.length > 0 && (
        <p className="mb-2 text-[13px] text-muted" aria-live="polite">
          {pluralize(customers.length, "result")} for “<span className="text-ink">{q}</span>” ·{" "}
          <Link href="/customers" className="text-brand hover:underline">
            Clear
          </Link>
        </p>
      )}

      {customers.length === 0 ? (
        <Card>
          {q ? (
            <EmptyState
              icon={<SearchX />}
              title="No customers match"
              description={`Nothing matches “${q}”. Try a shop name, contact person, phone number or city.`}
              action={
                <Button asChild size="sm">
                  <Link href="/customers">Clear search</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Users />}
              title="No customers yet"
              description="Add the shops and contractors who order from you. You can set their special prices and the words they use for products."
              action={canManage ? <AddCustomerButton /> : <p className="text-[13px] text-muted">Ask a manager to add customers.</p>}
            />
          )}
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-[var(--shadow-card)] md:block">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-xs text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">Customer</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Phone</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">City</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Language</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Orders</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Last order</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Approved order value</th>
                  <th scope="col" className="w-8 px-2"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="group relative border-b border-line last:border-b-0 hover:bg-surface-2">
                    <td className="px-4 py-2.5">
                      <Link href={`/customers/${c.id}`} className="font-medium text-ink after:absolute after:inset-0 after:content-[''] hover:underline hover:underline-offset-2">
                        {c.name}
                      </Link>
                      {c.contactName && <div className="text-xs text-muted">{c.contactName}</div>}
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-ink-2">{c.phone ?? <span className="text-faint">—</span>}</td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-ink-2 lg:table-cell">{c.city ?? <span className="text-faint">—</span>}</td>
                    <td className="px-3 py-2.5">
                      <LanguagePill lang={c.preferredLanguage} />
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-ink-2">{c._count.orders}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{c.lastOrderAt ? formatRelative(c.lastOrderAt) : <span className="text-faint">Never</span>}</td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-right font-medium text-ink">
                      {c.approvedValuePaise ? formatPaise(c.approvedValuePaise) : <span className="font-normal text-faint">—</span>}
                    </td>
                    <td className="px-2 text-faint">
                      <ChevronRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {customers.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/customers/${c.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-card)] active:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">{c.name}</div>
                      <div className="truncate text-xs text-muted">{[c.contactName, c.city].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <LanguagePill lang={c.preferredLanguage} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-ink-2">
                    <span className="tnum">
                      {pluralize(c._count.orders, "order")}
                      {c.lastOrderAt && <span className="text-muted"> · last {formatRelative(c.lastOrderAt)}</span>}
                    </span>
                    {c.approvedValuePaise > 0 && (
                      <span className="tnum">
                        <span className="text-muted">Approved </span>
                        <span className="font-medium text-ink">{formatPaise(c.approvedValuePaise)}</span>
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
