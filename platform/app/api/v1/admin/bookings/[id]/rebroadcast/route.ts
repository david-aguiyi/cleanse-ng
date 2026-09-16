import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { serviceClient } from "@/db/service-client";
import { createDispatchRound } from "@/domain/dispatch/offer-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/admin/bookings/{id}/rebroadcast — start another dispatch round
// (Blueprint §7). Also the seam the Stage 7 durable worker reuses.
export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS", "DISPATCHER"]);
    const db = serviceClient();

    const { data: maxRound } = await db
      .from("job_offers")
      .select("dispatch_round")
      .eq("booking_id", ctx.params.id)
      .order("dispatch_round", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextRound = (maxRound?.dispatch_round ?? 0) + 1;

    const result = await createDispatchRound(ctx.params.id, { round: nextRound });

    await db.from("audit_logs").insert({
      actor_auth_user_id: admin.authUserId,
      action: "booking.rebroadcast",
      entity_type: "booking",
      entity_id: ctx.params.id,
      after_data: result,
    });

    return ok(result, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
