import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { getCleanerEarningsSummary } from "@/domain/payout/payout-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/cleaner/earnings — unpaid served balance, breakdown, and monthly payout history.
export async function GET(_req: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireCleaner();
    const summary = await getCleanerEarningsSummary(ctx.cleanerId);
    return ok(summary, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

