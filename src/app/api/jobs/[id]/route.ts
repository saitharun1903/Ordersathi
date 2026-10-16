import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireContext } from "@/server/context";
import { notFound } from "@/server/errors";
import { runJob } from "@/server/orders/pipeline";
import { errorResponse } from "../../_respond";

// Processing runs after the response (next/server `after`) and needs time on serverless hosts.
export const maxDuration = 60;

export async function GET(_req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  try {
    const c = await requireContext();
    const { id } = await ctx.params;
    const job = await prisma.processingJob.findFirst({
      where: { id, workspaceId: c.workspaceId },
      select: { id: true, orderId: true, status: true, stage: true, errorCode: true, errorMessage: true, retryable: true, leaseUntil: true, createdAt: true },
    });
    if (!job) throw notFound("Processing job");
    // Recover jobs whose worker died (e.g. server restart): re-run once the lease has expired.
    const stale =
      (job.status === "RUNNING" && job.leaseUntil && job.leaseUntil < new Date()) ||
      (job.status === "QUEUED" && Date.now() - job.createdAt.getTime() > 15_000);
    if (stale) after(() => runJob(job.id));
    const data = { id: job.id, orderId: job.orderId, status: job.status, stage: job.stage, errorCode: job.errorCode, errorMessage: job.errorMessage, retryable: job.retryable };
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse("job.get", err);
  }
}
