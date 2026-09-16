/**
 * PaymentService — initializes Paystack transactions and idempotently finalizes
 * successful payments (Blueprint §2.2, §8).
 *
 * The browser callback and the Paystack webhook BOTH call the same idempotent
 * finalizePaystackPayment(reference). Whichever arrives first finalizes; the
 * other becomes a no-op after verification (Blueprint §8.2).
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import { serverEnv } from "@/lib/env";
import { newPaymentReference } from "@/domain/booking/reference";
import { emitBookingConfirmed } from "@/domain/events/emit";
import {
  initializeTransaction,
  verifyTransaction,
} from "@/providers/paystack/paystack-client";
import { logger } from "@/observability/logger";

export interface InitResult {
  authorizationUrl: string;
  accessCode: string;
  providerReference: string;
}

export interface FinalizeResult {
  bookingId: string;
  bookingReference: string;
  alreadyFinalized: boolean;
  customerStatus: "CONFIRMED";
}

/** Initialize a Paystack transaction for a booking reference (Blueprint §8.1). */
export async function initializePaystack(
  bookingReference: string,
  callbackPath = "/api/v1/payments/paystack/callback"
): Promise<InitResult> {
  const db = serviceClient();

  const { data: booking } = await db
    .from("bookings")
    .select("id, public_reference, total_kobo, currency, customer_status, payment_status, customer_id")
    .eq("public_reference", bookingReference)
    .maybeSingle();

  if (!booking) throw new AppError("BOOKING_NOT_FOUND", "Booking not found.");
  if (booking.payment_status === "SUCCESS" || booking.customer_status === "CONFIRMED") {
    throw new AppError("BOOKING_NOT_PAYABLE", "This booking is already paid.");
  }

  const { data: customer } = await db
    .from("customers")
    .select("email")
    .eq("id", booking.customer_id)
    .single();
  if (!customer) throw new AppError("INTERNAL_ERROR", "Customer record missing.");

  const providerReference = newPaymentReference();

  // Store a PENDING payment BEFORE the external call.
  const { error: payErr } = await db.from("payments").insert({
    booking_id: booking.id,
    provider: "PAYSTACK",
    provider_reference: providerReference,
    expected_amount_kobo: booking.total_kobo,
    currency: booking.currency,
    status: "PENDING",
  });
  if (payErr) throw new AppError("INTERNAL_ERROR", "Could not create payment record.");

  const callbackUrl = `${serverEnv.appUrl()}${callbackPath}`;
  const init = await initializeTransaction({
    email: customer.email,
    amountKobo: Number(booking.total_kobo),
    reference: providerReference,
    callbackUrl,
    bookingReference: booking.public_reference,
  });

  await db.from("booking_events").insert({
    booking_id: booking.id,
    event_type: "payment.initialized",
    actor_type: "SYSTEM",
    data: { provider_reference: providerReference },
  });

  return {
    authorizationUrl: init.authorizationUrl,
    accessCode: init.accessCode,
    providerReference,
  };
}

/**
 * Idempotently verify + finalize a Paystack payment by provider reference.
 * Requires status=success, matching reference, currency=NGN and amount equal to
 * the expected amount before confirming the booking (Blueprint §8.2).
 */
export async function finalizePaystackPayment(providerReference: string): Promise<FinalizeResult> {
  const db = serviceClient();

  const { data: payment } = await db
    .from("payments")
    .select("id, booking_id, expected_amount_kobo, currency, status")
    .eq("provider_reference", providerReference)
    .maybeSingle();
  if (!payment) throw new AppError("PAYMENT_VERIFICATION_FAILED", "Unknown payment reference.");

  const { data: booking } = await db
    .from("bookings")
    .select("id, public_reference, payment_status, customer_status")
    .eq("id", payment.booking_id)
    .single();
  if (!booking) throw new AppError("BOOKING_NOT_FOUND", "Booking not found.");

  // Idempotent short-circuit: already finalized -> no-op, no duplicate events.
  if (payment.status === "SUCCESS" && booking.customer_status === "CONFIRMED") {
    return {
      bookingId: booking.id,
      bookingReference: booking.public_reference,
      alreadyFinalized: true,
      customerStatus: "CONFIRMED",
    };
  }

  // Server-side verification is the final authority.
  const verify = await verifyTransaction(providerReference);
  const amountOk = verify.amountKobo === Number(payment.expected_amount_kobo);
  const currencyOk = verify.currency === payment.currency;
  const refOk = verify.reference === providerReference;

  if (verify.status !== "success" || !refOk || !currencyOk) {
    // Payment did not succeed / mismatch — never confirm the booking.
    await db
      .from("payments")
      .update({ status: "FAILED", provider_payload: verify.raw, verified_at: new Date().toISOString() })
      .eq("id", payment.id);
    throw new AppError("PAYMENT_VERIFICATION_FAILED", "Payment could not be verified.");
  }

  if (!amountOk) {
    // Security/ops exception: correct reference but wrong amount.
    logger.error("Paystack amount mismatch", {
      providerReference,
      expected: Number(payment.expected_amount_kobo),
      got: verify.amountKobo,
    });
    await db.from("booking_events").insert({
      booking_id: booking.id,
      event_type: "payment.amount_mismatch",
      actor_type: "PROVIDER",
      data: { expected: Number(payment.expected_amount_kobo), got: verify.amountKobo },
    });
    throw new AppError("AMOUNT_MISMATCH", "Paid amount does not match the expected total.");
  }

  const nowIso = new Date().toISOString();

  // Finalize: mark payment SUCCESS, confirm booking, record event.
  // Guard the booking update on payment_status <> 'SUCCESS' so concurrent
  // callback+webhook arrivals do not both confirm/emit.
  await db
    .from("payments")
    .update({
      status: "SUCCESS",
      paid_amount_kobo: verify.amountKobo,
      channel: verify.channel,
      provider_transaction_id: verify.transactionId,
      paid_at: verify.paidAt,
      verified_at: nowIso,
      provider_payload: verify.raw,
    })
    .eq("id", payment.id);

  const { data: confirmed } = await db
    .from("bookings")
    .update({
      payment_status: "SUCCESS",
      customer_status: "CONFIRMED",
      confirmed_at: nowIso,
    })
    .eq("id", booking.id)
    .neq("customer_status", "CONFIRMED")
    .select("id")
    .maybeSingle();

  // Only emit booking.confirmed once — when this call performed the transition.
  if (confirmed) {
    await emitBookingConfirmed(booking.id, booking.public_reference);
  }

  return {
    bookingId: booking.id,
    bookingReference: booking.public_reference,
    alreadyFinalized: !confirmed,
    customerStatus: "CONFIRMED",
  };
}
