/**
 * Domain event emission. For Stages 0-2 this records the business event and
 * logs it. Stage 7 wires `booking.confirmed` into Inngest to drive durable
 * dispatch (Blueprint §13). Kept behind one function so call sites do not change
 * when Inngest is added.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { logger } from "@/observability/logger";

export async function emitBookingConfirmed(bookingId: string, reference: string): Promise<void> {
  const db = serviceClient();
  await db.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "booking.confirmed",
    actor_type: "SYSTEM",
    data: { reference },
  });

  // TODO(Stage 7): await inngest.send({ name: "booking/confirmed", data: { bookingId } });
  logger.info("booking.confirmed emitted (dispatch wired in Stage 7)", { bookingId, reference });
}
