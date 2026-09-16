import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { activeTokens } from "@/domain/cleaner/device-service";
import { sendToTokens } from "@/providers/firebase/push-gateway";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/admin/cleaners/{id}/test-push — send a device-health test push to
// a cleaner's active tokens (Blueprint §11.3 device health, §20.1 alert test).
export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    const tokens = await activeTokens(ctx.params.id);
    const result = await sendToTokens(tokens, {
      title: "Cleanse test alert",
      body: "Your job alerts are working. No action needed.",
      offerId: "test",
      bookingReference: "TEST",
      deepLinkPath: "/cleaner/home",
    });
    return ok(result, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
