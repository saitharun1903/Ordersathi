import { requireContext } from "@/server/context";
import { CSV_TEMPLATE } from "@/server/catalogue/service";
import { AppError, HTTP_STATUS } from "@/server/errors";

/** CSV template for catalogue import. UTF-8 with BOM so Excel renders Telugu correctly. */
export async function GET() {
  try {
    await requireContext();
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message, code: err.code }, { status: HTTP_STATUS[err.code] });
    }
    throw err;
  }
  return new Response(`﻿${CSV_TEMPLATE}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ordersathi-catalogue-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
