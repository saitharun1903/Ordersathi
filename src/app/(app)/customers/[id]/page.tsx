import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Inbox, MapPin, Phone, User } from "lucide-react";
import { requirePageContext } from "@/server/context";
import { can } from "@/server/permissions";
import { AppError } from "@/server/errors";
import { getCustomerDetail } from "@/server/customers/service";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge } from "@/components/ui/status";
import { LanguagePill } from "@/components/customers/language-pill";
import { CustomerActions } from "@/components/customers/customer-actions";
import { CustomerPrices, type CustomerPriceRow } from "@/components/customers/customer-prices";
import { CustomerAliases, type CustomerAliasRow } from "@/components/customers/customer-aliases";
import type { AliasLang } from "@/components/catalogue/types";
import { formatPaise } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage(props: PageProps<"/customers/[id]">) {
  const ctx = await requirePageContext();
  const { id } = await props.params;
  let customer: Awaited<ReturnType<typeof getCustomerDetail>>;
  try {
    customer = await getCustomerDetail(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const canManage = can(ctx.role, "customer.manage");
  const archived = !!customer.archivedAt;

  const prices: CustomerPriceRow[] = customer.prices.map((p) => ({
    productId: p.product.id,
    sku: p.product.sku,
    name: p.product.name,
    sellingUnit: p.product.sellingUnit,
    standardPricePaise: p.product.pricePaise,
    pricePaise: p.pricePaise,
    archived: !!p.product.archivedAt,
  }));
  const aliases: CustomerAliasRow[] = customer.aliases.map((a) => ({
    id: a.id,
    text: a.text,
    language: a.language as AliasLang,
    product: a.product,
  }));

  return (
    <>
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1 rounded text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Customers
      </Link>

      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink sm:text-[28px]">{customer.name}</h1>
            <LanguagePill lang={customer.preferredLanguage} />
          </div>
          <dl className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
            {customer.contactName && (
              <div className="flex items-center gap-1.5">
                <dt>
                  <User className="size-3.5 text-faint" aria-label="Contact" />
                </dt>
                <dd>{customer.contactName}</dd>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-1.5">
                <dt>
                  <Phone className="size-3.5 text-faint" aria-label="Phone" />
                </dt>
                <dd>
                  <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="tnum hover:text-brand hover:underline">
                    {customer.phone}
                  </a>
                </dd>
              </div>
            )}
            {customer.city && (
              <div className="flex items-center gap-1.5">
                <dt>
                  <MapPin className="size-3.5 text-faint" aria-label="City" />
                </dt>
                <dd>{customer.city}</dd>
              </div>
            )}
            <div className="text-muted">
              <dt className="sr-only">Customer since</dt>
              <dd>Customer since {formatDate(customer.createdAt)}</dd>
            </div>
          </dl>
          {customer.notes && <p className="mt-2 max-w-2xl whitespace-pre-line text-[13px] text-muted">{customer.notes}</p>}
        </div>
        {canManage && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <CustomerActions
              archived={archived}
              customer={{
                id: customer.id,
                name: customer.name,
                contactName: customer.contactName,
                phone: customer.phone,
                city: customer.city,
                preferredLanguage: customer.preferredLanguage,
                notes: customer.notes,
              }}
            />
          </div>
        )}
      </div>

      {archived && (
        <p className="mb-4 rounded-lg border border-warn-line bg-warn-soft px-3 py-2 text-[13px] text-warn" role="status">
          This customer was archived on {formatDate(customer.archivedAt!)}. They are hidden from the customer list.
        </p>
      )}

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader
            title="Order history"
            description={customer.orders.length >= 50 ? "Showing the 50 most recent orders." : undefined}
          />
          {customer.orders.length === 0 ? (
            <EmptyState icon={<Inbox />} title="No orders yet" description="Orders you create for this customer will appear here." className="py-10" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-left text-xs text-muted">
                    <th scope="col" className="px-4 py-2 font-medium sm:px-5">Order</th>
                    <th scope="col" className="px-3 py-2 font-medium">Created</th>
                    <th scope="col" className="px-3 py-2 font-medium">Status</th>
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Lines</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium sm:px-5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="relative border-b border-line last:border-b-0 hover:bg-surface-2">
                      <td className="px-4 py-2.5 sm:px-5">
                        <Link href={`/orders/${o.id}`} className="tnum font-medium text-brand after:absolute after:inset-0 after:content-[''] hover:underline">
                          #{o.number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDateTime(o.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="tnum hidden px-3 py-2.5 text-right text-ink-2 sm:table-cell">{o._count.lines}</td>
                      <td className="tnum whitespace-nowrap px-3 py-2.5 text-right font-medium text-ink sm:px-5">{formatPaise(o.totalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
          <CustomerPrices customerId={customer.id} prices={prices} canManage={canManage} />
          <CustomerAliases customerId={customer.id} aliases={aliases} canManage={canManage} />
        </div>
      </div>
    </>
  );
}
