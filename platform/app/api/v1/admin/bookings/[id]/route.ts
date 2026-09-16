import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { getBookingDetail } from "@/domain/admin/admin-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/bookings/{id} — full booking control-centre view.
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const detail = await getBookingDetail(ctx.params.id);
    return ok(detail, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
