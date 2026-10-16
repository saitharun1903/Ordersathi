export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "INVALID_STATE"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA";

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Record") => new AppError("NOT_FOUND", `${what} not found`);
export const forbidden = (msg = "You don't have permission to do that") => new AppError("FORBIDDEN", msg);
export const conflict = (msg = "This order was changed by someone else. Reload to see the latest version.") =>
  new AppError("CONFLICT", msg);

export const HTTP_STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  INVALID_STATE: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA: 415,
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode | "INTERNAL"; message: string; fieldErrors?: Record<string, string> };
