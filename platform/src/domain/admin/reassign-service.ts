/**
 * Reassignment (Blueprint §7 reassign, §20.2). Closes the current active
 * assignment(s) as REASSIGNED — keeping the history — revokes any customer share
 * card, and returns the booking to dispatch so a new cleaner can be found.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import { revokeShareCards } from "./share-card-service";
import type { AdminContext } from "@/auth/admin";

export interface ReassignResult {
  closedAssignments: number;
  fulfilmentStatus: string;
}

export async function reassignBooking(
  bookingId: string,
  reason: string,
  admin: AdminContext
): Promise<ReassignResult> {
  const db = serviceClient();
  const nowIso = new Date().toISOString();

  const { data: booking } = await db
    .from("bookings")
    .select("id, fulfilment_status, customer_status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw new AppError("BOOKING_NOT_FOUND", "Booking not found.");
  if (["COMPLETED", "CANCELLED"].includes(booking.fulfilment_status)) {
    throw new AppError("BOOKING_NOT_PAYABLE", "This booking is closed.");
  }

  // Close active assignments as REASSIGNED (history is retained).
  const { data: closed } = await db
    .from("job_assignments")
    .update({ status: "REASSIGNED", ended_at: nowIso, end_reason: reason })
    .eq("booking_id", bookingId)
    .in("status", ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"])
    .select("id");

  // Return the booking to the dispatch pool.
  await db
    .from("bookings")
    .update({ assigned_cleaner_id: null, fulfilment_status: "UNASSIGNED", assigned_at: null })
    .eq("id", bookingId);

  // Revoke any share card that pointed at the removed cleaner.
  await revokeShareCards(bookingId);

  await db.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "assignment.reassigned",
    actor_type: "ADMIN",
    actor_id: admin.adminId,
    data: { reason, closed: closed?.length ?? 0 },
  });
  await db.from("audit_logs").insert({
    actor_auth_user_id: admin.authUserId,
    action: "booking.reassigned",
    entity_type: "booking",
    entity_id: bookingId,
    after_data: { reason },
  });

  return { closedAssignments: closed?.length ?? 0, fulfilmentStatus: "UNASSIGNED" };
}
