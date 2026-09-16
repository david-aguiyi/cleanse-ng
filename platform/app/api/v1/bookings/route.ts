import { NextRequest } from "next/server";
import { createBookingSchema } from "@/validation/schemas";
import { createBooking } from "@/domain/booking/booking-service";
import { ok, handleError } from "@/http/response";
import { rateLimitByIp } from "@/http/rate-limit";
import { newRequestId, logger } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/bookings — create an AWAITING_PAYMENT booking from a valid quote
// (Blueprint §7.3). The Idempotency-Key header is accepted for safe retries.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    rateLimitByIp(req, "bookings", 15, 60_000);
    const body = await req.json();
    const input = createBookingSchema.parse(body);
    const booking = await createBooking(input);
    logger.info("booking.created", { requestId, reference: booking.bookingReference });

    return ok(
      {
        booking_reference: booking.bookingReference,
        status: booking.status,
        total_kobo: booking.totalKobo,
        currency: booking.currency,
      },
      requestId,
      201
    );
  } catch (err) {
    return handleError(err, requestId);
  }
}
