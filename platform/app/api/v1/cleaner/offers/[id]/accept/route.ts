import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { acceptOffer } from "@/domain/assignment/assignment-service";
import { ok, fail, handleError } from "@/http/response";
import { rateLimitByIp } from "@/http/rate-limit";
import { newRequestId, logger } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/cleaner/offers/{id}/accept — atomic first-accept-wins claim.
// Returns WON, or 409 OFFER_ALREADY_TAKEN when another cleaner won first
// (Blueprint §7.4). The Idempotency-Key header is accepted for safe retries.
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    rateLimitByIp(req, "offer-accept", 30, 60_000);
    const cleaner = await requireCleaner();
    const result = await acceptOffer(ctx.params.id, cleaner.cleanerId);
    logger.info("offer.accept", { requestId, offerId: ctx.params.id, result: result.result });

    if (result.result === "WON") {
      return ok(
        {
          result: "WON",
          booking_reference: result.bookingReference,
          job_url: result.jobUrl,
        },
        requestId
      );
    }
    if (result.result === "ALREADY_TAKEN") {
      return fail(
        "OFFER_ALREADY_TAKEN",
        "This job has already been taken.",
        requestId,
        409
      );
    }
    if (result.result === "TIME_CONFLICT") {
      return fail(
        "CLEANER_TIME_CONFLICT",
        "You already have a job around this time. Finish it before taking another.",
        requestId,
        409
      );
    }
    return fail("OFFER_NOT_ACTIVE", "This offer is no longer active.", requestId, 409);
  } catch (err) {
    return handleError(err, requestId);
  }
}
