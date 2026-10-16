import { after, NextResponse } from "next/server";
import { requireContext } from "@/server/context";
import { createIntake } from "@/server/orders/service";
import { runJob } from "@/server/orders/pipeline";
import { AppError } from "@/server/errors";
import { errorResponse } from "../../_respond";

// Processing runs after the response (next/server `after`) and needs time on serverless hosts.
export const maxDuration = 60;

// Multipart intake for text, audio and images. Uses XHR on the client for upload progress.
export async function POST(request: Request) {
  try {
    const ctx = await requireContext();
    const form = await request.formData();
    const file = form.get("file");
    let upload: { bytes: Buffer; name: string } | null = null;
    if (file && typeof file !== "string") {
      if (file.size > 25 * 1024 * 1024) throw new AppError("PAYLOAD_TOO_LARGE", "File is too large.");
      upload = { bytes: Buffer.from(await file.arrayBuffer()), name: file.name || "upload" };
    }
    const str = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" ? v : undefined;
    };
    const result = await createIntake(
      ctx,
      {
        idempotencyKey: str("idempotencyKey") ?? "",
        inputType: (str("inputType") ?? "TEXT") as "TEXT",
        inputLanguage: (str("inputLanguage") ?? "AUTO") as "AUTO",
        customerId: str("customerId") || null,
        text: str("text") ?? null,
      },
      upload,
    );
    if (result.jobId && !result.deduped) {
      const jobId = result.jobId;
      after(() => runJob(jobId));
    }
    return NextResponse.json({ ok: true, data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse("order.intake", err);
  }
}
