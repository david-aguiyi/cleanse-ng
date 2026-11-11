import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { listOperatorPayoutsOverview } from "@/domain/payout/payout-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/payouts — unpaid earned balances, bank details, and settlement history.
export async function GET(_req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const res = await listOperatorPayoutsOverview();
    return ok(res, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

