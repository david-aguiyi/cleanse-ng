import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { getMe } from "@/domain/cleaner/cleaner-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/cleaner/me — profile + current availability.
export async function GET(_req: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireCleaner();
    const me = await getMe(ctx.cleanerId);
    return ok(me, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
