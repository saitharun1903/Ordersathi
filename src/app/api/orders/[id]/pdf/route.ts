import { prisma } from "@/lib/db";
import { requireContext } from "@/server/context";
import { AppError, notFound } from "@/server/errors";
import { assertCan } from "@/server/permissions";
import { renderConfirmationPdf } from "@/server/orders/pdf";
import type { ApprovedSnapshot } from "@/server/orders/service";
import { errorResponse } from "../../../_respond";

export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]/pdf">) {
  try {
    const c = await requireContext();
    assertCan(c.role, "order.view");
    const { id } = await ctx.params;
    const order = await prisma.order.findFirst({ where: { id, workspaceId: c.workspaceId }, select: { id: true, status: true, approvedSnapshot: true, number: true } });
    if (!order) throw notFound("Order");
    if (order.status !== "APPROVED" || !order.approvedSnapshot) throw new AppError("INVALID_STATE", "Only approved orders have a confirmation PDF.");
    const pdf = await renderConfirmationPdf(order.approvedSnapshot as unknown as ApprovedSnapshot);
    await prisma.auditEvent.create({ data: { workspaceId: c.workspaceId, orderId: order.id, actorId: c.userId, actorName: c.userName, type: "confirmation.pdf", data: {} } });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="order-confirmation-${String(order.number).padStart(4, "0")}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse("order.pdf", err);
  }
}
