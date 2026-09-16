/**
 * Standard JSON response envelope (Blueprint §7 / §7.1). Every response — success
 * or error — carries a request_id for tracing.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { logger } from "@/observability/logger";
import { captureException } from "@/observability/sentry";

export function ok<T>(data: T, requestId: string, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data, request_id: requestId }, { status });
}

export function fail(
  code: string,
  message: string,
  requestId: string,
  status: number,
  details: unknown = null
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message, details }, request_id: requestId },
    { status }
  );
}

/**
 * Convert any thrown value into the standard error envelope. Unknown errors are
 * logged and reduced to a generic 500 so internals never leak to the client.
 */
export function handleError(err: unknown, requestId: string): NextResponse {
  if (err instanceof AppError) {
    return fail(err.code, err.message, requestId, err.httpStatus, err.details);
  }
  if (err instanceof ZodError) {
    return fail(
      "VALIDATION_ERROR",
      "One or more fields are invalid.",
      requestId,
      400,
      err.flatten()
    );
  }
  logger.error("Unhandled error", { requestId, error: String(err) });
  captureException(err, { requestId });
  return fail("INTERNAL_ERROR", "Something went wrong. Please try again.", requestId, 500);
}
