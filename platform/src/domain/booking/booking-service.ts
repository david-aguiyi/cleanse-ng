/**
 * BookingService — creates booking drafts from a valid quote and controls
 * booking transitions (Blueprint §2.2, §3.1). A booking is created in
 * AWAITING_PAYMENT; it only becomes CONFIRMED after verified payment.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import { newBookingReference } from "./reference";
import type { CreateBookingInput } from "@/validation/schemas";

export interface CreatedBooking {
  bookingReference: string;
  status: "AWAITING_PAYMENT";
  totalKobo: number;
  currency: string;
}

export async function createBooking(input: CreateBookingInput): Promise<CreatedBooking> {
  const db = serviceClient();

  // 1. Load and validate the quote (must exist and be unexpired).
  const { data: quote, error: quoteErr } = await db
    .from("quotes")
    .select(
      "id, service_id, zone_id, property_bedrooms, requested_cleaner_count, subtotal_kobo, extras_kobo, total_kobo, currency, service_fee_bps, calculation_snapshot, expires_at"
    )
    .eq("id", input.quote_id)
    .maybeSingle();

  if (quoteErr) throw new AppError("INTERNAL_ERROR", "Could not load quote.");
  if (!quote) throw new AppError("QUOTE_NOT_FOUND", "Quote not found. Please recalculate.");
  if (new Date(quote.expires_at).getTime() <= Date.now()) {
    throw new AppError("QUOTE_EXPIRED", "Your quote has expired. Please recalculate.");
  }

  // 2. Resolve zone from the address payload; must match a serviceable zone.
  const { data: zone } = await db
    .from("service_zones")
    .select("id, active")
    .eq("code", input.address.zone_code)
    .maybeSingle();
  if (!zone || !zone.active) {
    throw new AppError("ZONE_NOT_SERVICEABLE", "We do not currently serve this area.");
  }

  // 3. Upsert customer (guest checkout — no account required).
  const { data: customer, error: custErr } = await db
    .from("customers")
    .insert({
      full_name: input.customer.full_name,
      email: input.customer.email,
      phone_e164: input.customer.phone_e164,
      whatsapp_e164: input.customer.whatsapp_e164,
      marketing_opt_in: input.customer.marketing_opt_in,
    })
    .select("id")
    .single();
  if (custErr || !customer) throw new AppError("INTERNAL_ERROR", "Could not save customer.");

  // 4. Store the service address owned by the customer.
  const { data: address, error: addrErr } = await db
    .from("customer_addresses")
    .insert({
      customer_id: customer.id,
      zone_id: zone.id,
      address_line1: input.address.address_line1,
      address_line2: input.address.address_line2 ?? null,
      estate: input.address.estate ?? null,
      landmark: input.address.landmark ?? null,
      directions: input.address.directions ?? null,
    })
    .select("id")
    .single();
  if (addrErr || !address) throw new AppError("INTERNAL_ERROR", "Could not save address.");

  // 5. Create the AWAITING_PAYMENT booking with an immutable price snapshot.
  const reference = newBookingReference();
  const { data: booking, error: bookErr } = await db
    .from("bookings")
    .insert({
      public_reference: reference,
      customer_id: customer.id,
      address_id: address.id,
      quote_id: quote.id,
      service_id: quote.service_id,
      zone_id: zone.id,
      booking_mode: input.booking_mode,
      scheduled_start_at: input.scheduled_start_at,
      requested_cleaner_count: quote.requested_cleaner_count,
      property_bedrooms: quote.property_bedrooms,
      customer_status: "AWAITING_PAYMENT",
      fulfilment_status: "UNASSIGNED",
      payment_status: "PENDING",
      subtotal_kobo: quote.subtotal_kobo,
      extras_kobo: quote.extras_kobo,
      total_kobo: quote.total_kobo,
      currency: quote.currency,
      service_fee_bps: quote.service_fee_bps,
      price_snapshot: quote.calculation_snapshot,
      customer_notes: input.customer_notes ?? null,
    })
    .select("id, public_reference, total_kobo, currency")
    .single();
  if (bookErr || !booking) throw new AppError("INTERNAL_ERROR", "Could not create booking.");

  // 6. Snapshot priced line items for the booking.
  const snapshotItems = (quote.calculation_snapshot as { line_items?: unknown[] })?.line_items;
  if (Array.isArray(snapshotItems) && snapshotItems.length > 0) {
    await db.from("booking_items").insert(
      snapshotItems.map((raw) => {
        const item = raw as Record<string, unknown>;
        return {
          booking_id: booking.id,
          item_type: String(item.item_type ?? "ADJUSTMENT"),
          code: String(item.code ?? "ITEM"),
          description: String(item.description ?? ""),
          quantity: Number(item.quantity ?? 1),
          unit_amount_kobo: Number(item.unit_amount_kobo ?? 0),
          line_total_kobo: Number(item.line_total_kobo ?? 0),
        };
      })
    );
  }

  await db.from("booking_events").insert({
    booking_id: booking.id,
    event_type: "booking.created",
    actor_type: "CUSTOMER",
    data: { reference: booking.public_reference },
  });

  return {
    bookingReference: booking.public_reference,
    status: "AWAITING_PAYMENT",
    totalKobo: Number(booking.total_kobo),
    currency: booking.currency,
  };
}
