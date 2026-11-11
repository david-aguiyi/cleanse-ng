import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { settleCleanerPayout } from "@/domain/payout/payout-service";
import { settlePayoutSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/admin/cleaners/{id}/settle — Confirm Paid & clear monthly unpaid earnings.
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const input = settlePayoutSchema.parse(await req.json());
    const result = await settleCleanerPayout(ctx.params.id, admin, input);
    return ok(result, requestId, 201);
  } catch (err) {
    return handleError(err, requestId);
  }
}

