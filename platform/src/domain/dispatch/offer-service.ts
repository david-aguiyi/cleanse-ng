/**
 * OfferService — creates dispatch rounds of customer-safe job offers for a
 * confirmed booking (Blueprint §3.2, §10.3). Called by admin rebroadcast now and
 * by the durable dispatch worker in Stage 7. Push is best-effort and never
 * exposes exact address/customer contact.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import { dispatchConfig, payoutConfig } from "@/config";
import { getEligibleCleaners } from "./eligibility";
import { newShortCode } from "@/domain/booking/reference";
import { activeTokens } from "@/domain/cleaner/device-service";
import { sendToTokens } from "@/providers/firebase/push-gateway";
import { logger } from "@/observability/logger";

export interface DispatchRoundResult {
  round: number;
  offersCreated: number;
  pushSent: number;
  candidatesConsidered: number;
  fulfilmentStatus: string;
}

function payoutKobo(totalKobo: number): number {
  return Math.round((totalKobo * payoutConfig.cleanerPayoutBps) / 10000);
}

export interface DispatchState {
  exists: boolean;
  fulfilmentStatus: string;
  customerStatus: string;
  requestedCleaners: number;
  activeAssignments: number;
  fullyAssigned: boolean;
  terminal: boolean; // completed/cancelled — dispatch should stop
}

/** Snapshot used by the durable worker to decide whether to keep dispatching. */
export async function getDispatchState(bookingId: string): Promise<DispatchState> {
  const db = serviceClient();
  const { data: booking } = await db
    .from("bookings")
    .select("fulfilment_status, customer_status, requested_cleaner_count")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) {
    return {
      exists: false,
      fulfilmentStatus: "",
      customerStatus: "",
      requestedCleaners: 0,
      activeAssignments: 0,
      fullyAssigned: false,
      terminal: true,
    };
  }
  const { count } = await db
    .from("job_assignments")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .in("status", ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"]);
  const active = count ?? 0;
  return {
    exists: true,
    fulfilmentStatus: booking.fulfilment_status,
    customerStatus: booking.customer_status,
    requestedCleaners: booking.requested_cleaner_count,
    activeAssignments: active,
    fullyAssigned: active >= booking.requested_cleaner_count,
    terminal: ["COMPLETED", "CANCELLED"].includes(booking.fulfilment_status),
  };
}

/** Expire still-active offers whose TTL has passed (Blueprint §10.2 OFFER_TTL). */
export async function expireStaleOffers(bookingId: string): Promise<number> {
  const db = serviceClient();
  const { data } = await db
    .from("job_offers")
    .update({ status: "EXPIRED" })
    .eq("booking_id", bookingId)
    .in("status", ["CREATED", "PUSH_SENT", "SMS_SENT", "VIEWED"])
    .lt("expires_at", new Date().toISOString())
    .select("id");
  return data?.length ?? 0;
}

/** Mark a still-unassigned booking as EXCEPTION and raise an ops alert (§10.3). */
export async function escalateBooking(bookingId: string): Promise<void> {
  const db = serviceClient();
  const { data: updated } = await db
    .from("bookings")
    .update({ fulfilment_status: "EXCEPTION" })
    .eq("id", bookingId)
    .in("fulfilment_status", ["UNASSIGNED", "DISPATCHING", "PARTIALLY_ASSIGNED"])
    .select("id")
    .maybeSingle();

  if (updated) {
    await db.from("booking_events").insert({
      booking_id: bookingId,
      event_type: "dispatch.escalated",
      actor_type: "SYSTEM",
      data: { reason: "no_cleaner_assigned_within_sla" },
    });
    await db.from("notifications").insert({
      booking_id: bookingId,
      channel: "ADMIN_INAPP",
      provider: "INTERNAL",
      recipient: "operations",
      template_code: "DISPATCH_ESCALATION",
      status: "SENT",
      sent_at: new Date().toISOString(),
      payload: { severity: "URGENT", message: "Paid booking unassigned within SLA." },
    });
    logger.warn("dispatch.escalated", { bookingId });
  }
}

/** Create a dispatch round for a booking's unfilled slots. */
export async function createDispatchRound(
  bookingId: string,
  opts: { round: number; size?: number } = { round: 1 }
): Promise<DispatchRoundResult> {
  const db = serviceClient();

  const { data: booking } = await db
    .from("bookings")
    .select(
      "id, public_reference, payment_status, customer_status, fulfilment_status, requested_cleaner_count, scheduled_start_at, property_bedrooms, total_kobo, service_id, zone_id"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw new AppError("BOOKING_NOT_FOUND", "Booking not found.");

  if (
    booking.payment_status !== "SUCCESS" ||
    booking.customer_status !== "CONFIRMED" ||
    ["COMPLETED", "CANCELLED"].includes(booking.fulfilment_status)
  ) {
    throw new AppError("BOOKING_NOT_PAYABLE", "Booking is not in a dispatchable state.");
  }

  // Which slots still need a cleaner?
  const { data: activeAssignments } = await db
    .from("job_assignments")
    .select("slot_number")
    .eq("booking_id", bookingId)
    .in("status", ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"]);
  const filledSlots = new Set((activeAssignments ?? []).map((a: Record<string, any>) => a.slot_number));
  const unfilledSlots: number[] = [];
  for (let s = 1; s <= booking.requested_cleaner_count; s++) {
    if (!filledSlots.has(s)) unfilledSlots.push(s);
  }
  if (unfilledSlots.length === 0) {
    return {
      round: opts.round,
      offersCreated: 0,
      pushSent: 0,
      candidatesConsidered: 0,
      fulfilmentStatus: booking.fulfilment_status,
    };
  }

  // Exclude cleaners already offered/assigned this booking.
  const { data: prior } = await db
    .from("job_offers")
    .select("cleaner_id")
    .eq("booking_id", bookingId);
  const exclude = Array.from(new Set((prior ?? []).map((o: Record<string, any>) => o.cleaner_id)));

  const size = opts.size ?? dispatchConfig.round1Size;
  const candidates = await getEligibleCleaners(bookingId, exclude, size);

  if (candidates.length === 0) {
    // No supply — surface to operations; customer stays CONFIRMED.
    await db
      .from("bookings")
      .update({ fulfilment_status: "EXCEPTION" })
      .eq("id", bookingId)
      .in("fulfilment_status", ["UNASSIGNED", "DISPATCHING", "PARTIALLY_ASSIGNED"]);
    await db.from("booking_events").insert({
      booking_id: bookingId,
      event_type: "dispatch.no_candidates",
      actor_type: "SYSTEM",
      data: { round: opts.round },
    });
    logger.warn("dispatch.no_candidates", { bookingId, round: opts.round });
    return {
      round: opts.round,
      offersCreated: 0,
      pushSent: 0,
      candidatesConsidered: 0,
      fulfilmentStatus: "EXCEPTION",
    };
  }

  const expiresAt = new Date(Date.now() + dispatchConfig.offerTtlSeconds * 1000).toISOString();
  const displayPayout = payoutKobo(Number(booking.total_kobo));

  // Distribute candidates across unfilled slots (round-robin) — one offer each.
  const rows = candidates.map((cleanerId, i) => ({
    booking_id: bookingId,
    cleaner_id: cleanerId,
    dispatch_round: opts.round,
    slot_number: unfilledSlots[i % unfilledSlots.length]!,
    status: "CREATED" as const,
    expires_at: expiresAt,
    metadata: {
      service_id: booking.service_id,
      property_bedrooms: booking.property_bedrooms,
      scheduled_start_at: booking.scheduled_start_at,
      payout_kobo: displayPayout,
      sms_code: newShortCode(),
    },
  }));

  const { data: created, error } = await db.from("job_offers").insert(rows).select("id, cleaner_id");
  if (error) throw error;

  // Move booking into DISPATCHING if it was waiting.
  await db
    .from("bookings")
    .update({ fulfilment_status: "DISPATCHING" })
    .eq("id", bookingId)
    .eq("fulfilment_status", "UNASSIGNED");

  await db.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "dispatch.round_started",
    actor_type: "SYSTEM",
    data: { round: opts.round, offers: created?.length ?? 0 },
  });

  // Best-effort push to each offered cleaner (customer-safe payload).
  let pushSent = 0;
  const { data: booking2 } = await db
    .from("service_zones")
    .select("name")
    .eq("id", booking.zone_id)
    .maybeSingle();
  const zoneName = booking2?.name ?? "your area";

  await Promise.all(
    (created ?? []).map(async (offer: Record<string, any>) => {
      const tokens = await activeTokens(offer.cleaner_id);
      if (tokens.length === 0) return;
      const res = await sendToTokens(tokens, {
        title: "New Cleanse job available",
        body: `${booking.property_bedrooms ?? ""}BR · ${zoneName}`,
        offerId: offer.id,
        bookingReference: booking.public_reference,
        deepLinkPath: `/cleaner/offers/${offer.id}`,
      });
      if (res.delivered > 0) {
        pushSent += res.delivered;
        await db
          .from("job_offers")
          .update({ status: "PUSH_SENT", push_sent_at: new Date().toISOString() })
          .eq("id", offer.id)
          .eq("status", "CREATED");
      }
    })
  );

  return {
    round: opts.round,
    offersCreated: created?.length ?? 0,
    pushSent,
    candidatesConsidered: candidates.length,
    fulfilmentStatus: "DISPATCHING",
  };
}
