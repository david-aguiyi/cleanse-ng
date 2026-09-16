import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/auth/admin";
import { reassignBooking } from "@/domain/admin/reassign-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().trim().min(1).max(300).default("Operations reassignment") });

// POST /api/v1/admin/bookings/{id}/reassign — close current assignment and return
// the booking to dispatch (Blueprint §7, §20.2).
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS", "DISPATCHER"]);
    const body = await req.json().catch(() => ({}));
    const { reason } = schema.parse(body);
    const result = await reassignBooking(ctx.params.id, reason, admin);
    return ok(result, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
