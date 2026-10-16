import "server-only";
import { NextResponse } from "next/server";
import { AppError, HTTP_STATUS } from "@/server/errors";
import { toResult } from "@/server/actions/run";

export function errorResponse(name: string, err: unknown) {
  const r = toResult(name, err);
  const status = err instanceof AppError ? HTTP_STATUS[err.code] : r.code === "VALIDATION" ? 422 : 500;
  return NextResponse.json(r, { status, headers: { "Cache-Control": "no-store" } });
}
