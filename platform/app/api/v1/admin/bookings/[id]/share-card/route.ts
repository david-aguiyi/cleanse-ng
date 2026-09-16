import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { createShareCard } from "@/domain/admin/share-card-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/admin/bookings/{id}/share-card — create a short-lived customer-safe
// cleaner card + prefilled WhatsApp link (Blueprint §12).
export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS", "CUSTOMER_SUPPORT", "DISPATCHER"]);
    const result = await createShareCard(ctx.params.id, admin);
    return ok(
      { url: result.url, wa_url: result.waUrl, expires_at: result.expiresAt },
      requestId,
      201
    );
  } catch (err) {
    return handleError(err, requestId);
  }
}
