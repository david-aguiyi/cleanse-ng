/**
 * Domain event emission. Records the business event and enqueues the durable
 * dispatch flow via Inngest (Blueprint §13). Enqueue failures never fail the
 * paid-booking confirmation (Blueprint §4 Availability) — they are logged and
 * remain recoverable via admin rebroadcast.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { logger } from "@/observability/logger";
import { inngest } from "@/inngest/client";

export async function emitBookingConfirmed(bookingId: string, reference: string): Promise<void> {
  const db = serviceClient();
  await db.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "booking.confirmed",
    actor_type: "SYSTEM",
    data: { reference },
  });

  try {
    await inngest.send({
      name: "booking/confirmed",
      data: { bookingId, reference },
    });
  } catch (err) {
    // Do not fail confirmation; operations can rebroadcast manually.
    logger.error("dispatch.enqueue_failed", { bookingId, reference, error: String(err) });
  }
}
