/**
 * AssignmentService — cleaner offer viewing, the atomic first-accept-wins claim,
 * decline, and offer listing (Blueprint §3.2, §5.3, §7.4).
 *
 * Acceptance goes through the claim_job_offer RPC — never a "check then assign"
 * in the app. The winner is decided by the database, not frontend timing.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import { logger } from "@/observability/logger";

export interface OfferView {
  id: string;
  status: string;
  booking_reference: string;
  service_name: string;
  zone_name: string | null;
  property_bedrooms: number | null;
  scheduled_start_at: string;
  payout_kobo: number;
  expires_at: string;
  is_active: boolean;
  won: boolean;
  // Full operational details are present only when this cleaner has won the slot.
  full_details?: {
    customer_first_name: string;
    address_line1: string;
    estate: string | null;
    landmark: string | null;
    directions: string | null;
    customer_whatsapp: string;
  };
}

const ACTIVE_OFFER_STATES = ["CREATED", "PUSH_SENT", "SMS_SENT", "VIEWED"];

/** List a cleaner's active + recent offers. */
export async function listOffers(cleanerId: string) {
  const db = serviceClient();
  const { data } = await db
    .from("job_offers")
    .select(
      "id, status, expires_at, offered_at, slot_number, metadata, booking:bookings(public_reference, property_bedrooms, scheduled_start_at, zone:service_zones(name), service:services(name))"
    )
    .eq("cleaner_id", cleanerId)
    .order("offered_at", { ascending: false })
    .limit(30);

  return (data ?? []).map((o: Record<string, any>) => ({
    id: o.id,
    status: o.status,
    booking_reference: o.booking?.public_reference ?? "",
    service_name: o.booking?.service?.name ?? "Cleaning",
    zone_name: o.booking?.zone?.name ?? null,
    property_bedrooms: o.booking?.property_bedrooms ?? null,
    scheduled_start_at: o.booking?.scheduled_start_at ?? null,
    payout_kobo: Number(o.metadata?.payout_kobo ?? 0),
    expires_at: o.expires_at,
    is_active: ACTIVE_OFFER_STATES.includes(o.status) && new Date(o.expires_at).getTime() > Date.now(),
  }));
}

/** Load one offer for a cleaner and mark it VIEWED. Reveals full details if won. */
export async function getOfferForCleaner(offerId: string, cleanerId: string): Promise<OfferView> {
  const db = serviceClient();
  const { data: offerRow } = await db
    .from("job_offers")
    .select(
      "id, status, expires_at, slot_number, metadata, booking_id, booking:bookings(id, public_reference, property_bedrooms, scheduled_start_at, assigned_cleaner_id, zone:service_zones(name), service:services(name))"
    )
    .eq("id", offerId)
    .eq("cleaner_id", cleanerId)
    .maybeSingle();
  if (!offerRow) throw new AppError("OFFER_NOT_ACTIVE", "This offer is not available.");
  const offer: any = offerRow;

  // Mark viewed (only from a pre-view active state).
  if (["CREATED", "PUSH_SENT", "SMS_SENT"].includes(offer.status)) {
    await db
      .from("job_offers")
      .update({ status: "VIEWED", viewed_at: new Date().toISOString() })
      .eq("id", offerId)
      .in("status", ["CREATED", "PUSH_SENT", "SMS_SENT"]);
    offer.status = "VIEWED";
  }

  const isActive =
    ACTIVE_OFFER_STATES.includes(offer.status) && new Date(offer.expires_at).getTime() > Date.now();

  // Has this cleaner won this booking's slot?
  const { data: assignment } = await db
    .from("job_assignments")
    .select("id")
    .eq("booking_id", offer.booking_id)
    .eq("cleaner_id", cleanerId)
    .in("status", ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"])
    .maybeSingle();
  const won = Boolean(assignment);

  const view: OfferView = {
    id: offer.id,
    status: offer.status,
    booking_reference: offer.booking?.public_reference ?? "",
    service_name: offer.booking?.service?.name ?? "Cleaning",
    zone_name: offer.booking?.zone?.name ?? null,
    property_bedrooms: offer.booking?.property_bedrooms ?? null,
    scheduled_start_at: offer.booking?.scheduled_start_at,
    payout_kobo: Number(offer.metadata?.payout_kobo ?? 0),
    expires_at: offer.expires_at,
    is_active: isActive,
    won,
  };

  if (won) {
    const { data: fullRow } = await db
      .from("bookings")
      .select("customer:customers(full_name, whatsapp_e164), address:customer_addresses(address_line1, estate, landmark, directions)")
      .eq("id", offer.booking_id)
      .maybeSingle();
    const full: any = fullRow;
    if (full) {
      const firstName = String(full.customer?.full_name ?? "").split(" ")[0] ?? "";
      view.full_details = {
        customer_first_name: firstName,
        address_line1: full.address?.address_line1 ?? "",
        estate: full.address?.estate ?? null,
        landmark: full.address?.landmark ?? null,
        directions: full.address?.directions ?? null,
        customer_whatsapp: full.customer?.whatsapp_e164 ?? "",
      };
    }
  }

  return view;
}

export type AcceptResult =
  | { result: "WON"; bookingReference: string; jobUrl: string }
  | { result: "ALREADY_TAKEN" }
  | { result: "TIME_CONFLICT" }
  | { result: "OFFER_NOT_ACTIVE" };

/** Atomic accept via claim_job_offer RPC. Returns WON or a friendly reason. */
export async function acceptOffer(offerId: string, cleanerId: string): Promise<AcceptResult> {
  const db = serviceClient();
  const { data, error } = await db.rpc("claim_job_offer", {
    p_offer_id: offerId,
    p_cleaner_id: cleanerId,
  });
  if (error) {
    logger.error("claim_job_offer.error", { offerId, cleanerId, error: error.message });
    throw new AppError("INTERNAL_ERROR", "Could not process acceptance.");
  }

  // RPC returns a set with a single row.
  const row = Array.isArray(data) ? data[0] : data;
  const code = row?.result_code as string | undefined;

  if (row?.won) {
    const { data: booking } = await db
      .from("bookings")
      .select("public_reference")
      .eq("id", row.booking_id)
      .maybeSingle();
    const ref = booking?.public_reference ?? "";
    return { result: "WON", bookingReference: ref, jobUrl: `/cleaner/jobs/${ref}` };
  }

  if (code === "ALREADY_TAKEN" || code === "CLEANER_ALREADY_ON_BOOKING") {
    return { result: "ALREADY_TAKEN" };
  }
  if (code === "CLEANER_TIME_CONFLICT") {
    return { result: "TIME_CONFLICT" };
  }
  return { result: "OFFER_NOT_ACTIVE" };
}

/** Decline an active offer. */
export async function declineOffer(offerId: string, cleanerId: string): Promise<void> {
  const db = serviceClient();
  const { data: offer } = await db
    .from("job_offers")
    .select("id, status, booking_id")
    .eq("id", offerId)
    .eq("cleaner_id", cleanerId)
    .maybeSingle();
  if (!offer) throw new AppError("OFFER_NOT_ACTIVE", "This offer is not available.");

  await db
    .from("job_offers")
    .update({ status: "DECLINED", declined_at: new Date().toISOString() })
    .eq("id", offerId)
    .in("status", ACTIVE_OFFER_STATES);

  await db.from("booking_events").insert({
    booking_id: offer.booking_id,
    event_type: "job_offer.declined",
    actor_type: "CLEANER",
    actor_id: cleanerId,
    data: { offer_id: offerId },
  });
}
