import type { Prisma } from "@prisma/client";
import type { Ctx } from "./context";

type Tx = Prisma.TransactionClient;

export async function audit(
  tx: Tx,
  ctx: Pick<Ctx, "workspaceId" | "userId" | "userName"> | { workspaceId: string; userId: null; userName: string },
  type: string,
  data: Record<string, unknown> = {},
  orderId?: string | null,
) {
  await tx.auditEvent.create({
    data: {
      workspaceId: ctx.workspaceId,
      actorId: ctx.userId,
      actorName: ctx.userName,
      type,
      data: data as Prisma.InputJsonValue,
      orderId: orderId ?? null,
    },
  });
}
