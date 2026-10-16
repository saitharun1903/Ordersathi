import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { getOrderView } from "@/server/orders/view";
import { OrderReview } from "@/components/orders/review/order-review";

// Processing runs after the response (next/server `after`) and needs time on serverless hosts.
export const maxDuration = 300;

export async function generateMetadata(props: PageProps<"/orders/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const ctx = await requirePageContext();
  const o = await prisma.order.findFirst({ where: { id, workspaceId: ctx.workspaceId }, select: { number: true } });
  return { title: o ? `Order #${String(o.number).padStart(4, "0")}` : "Order" };
}

export default async function OrderPage(props: PageProps<"/orders/[id]">) {
  const ctx = await requirePageContext();
  const { id } = await props.params;
  let view;
  try {
    view = await getOrderView(ctx, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const customers = await prisma.customer.findMany({
    where: { workspaceId: ctx.workspaceId, OR: [{ archivedAt: null }, { id: view.customer?.id ?? "" }] },
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
  });
  return <OrderReview initial={view} customers={customers} businessName={ctx.workspaceName} role={ctx.role} />;
}
