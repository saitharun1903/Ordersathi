import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purgeExpiredSources } from "@/server/workspace/service";

// Daily retention purge (Vercel Cron). Requires `Authorization: Bearer $CRON_SECRET`.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  let purged = 0;
  for (const w of workspaces) purged += await purgeExpiredSources(w.id);
  return NextResponse.json({ ok: true, purged });
}
