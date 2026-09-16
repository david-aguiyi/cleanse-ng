import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { listBookings } from "@/domain/admin/admin-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/bookings — operations board list with filters/search.
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const rows = await listBookings({
      paymentStatus: sp.get("payment_status") ?? undefined,
      fulfilmentStatus: sp.get("fulfilment_status") ?? undefined,
      search: sp.get("q") ?? undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    });
    return ok({ bookings: rows }, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
