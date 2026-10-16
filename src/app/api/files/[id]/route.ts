import { prisma } from "@/lib/db";
import { requireContext } from "@/server/context";
import { notFound } from "@/server/errors";
import { getObject } from "@/server/storage";
import { errorResponse } from "../../_respond";

// Private file access: the upload must belong to the caller's active workspace.
export async function GET(request: Request, ctx: RouteContext<"/api/files/[id]">) {
  try {
    const c = await requireContext();
    const { id } = await ctx.params;
    const upload = await prisma.sourceUpload.findFirst({ where: { id, workspaceId: c.workspaceId, purgedAt: null } });
    if (!upload?.storageKey) throw notFound("File");
    const buf = await getObject(upload.storageKey);
    const headers: Record<string, string> = {
      "Content-Type": upload.mimeType ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Accept-Ranges": "bytes",
    };
    const range = request.headers.get("range");
    const m = range?.match(/^bytes=(\d*)-(\d*)$/);
    if (m) {
      const start = m[1] ? Number(m[1]) : Math.max(0, buf.length - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
      if (start >= buf.length || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${buf.length}` } });
      return new Response(new Uint8Array(buf.subarray(start, end + 1)), {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${buf.length}`, "Content-Length": String(end - start + 1) },
      });
    }
    return new Response(new Uint8Array(buf), { headers: { ...headers, "Content-Length": String(buf.length) } });
  } catch (err) {
    return errorResponse("file.get", err);
  }
}
