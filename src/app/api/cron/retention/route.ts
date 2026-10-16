import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purgeExpiredSources } from "@/server/workspace/service";
import { resetSharedDemo } from "@/server/demo/shared-demo";

// Daily maintenance (Vercel Cron): retention purge, and a reset of the shared sample workspace
// so visitors' uploads don't accumulate. Requires `Authorization: Bearer $CRON_SECRET`.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  let purged = 0;
  for (const w of workspaces) purged += await purgeExpiredSources(w.id);
  let demoReset = false;
  if (process.env.SHOW_DEMO_LOGIN !== "false" && process.env.RESET_SHARED_DEMO !== "false") {
    await resetSharedDemo(prisma);
    demoReset = true;
  }
  return NextResponse.json({ ok: true, purged, demoReset });
}
