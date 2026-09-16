/**
 * SMS fallback (Blueprint §9.4, §9.5, §13 offer.push-fallback).
 *
 * For each still-active offer that has not had a sufficient push response (no
 * active push token, or push-sent-but-not-viewed) and has not already been
 * SMS'd, send one short SMS with a short deep link to the authenticated offer
 * page. The link opens the offer; it never claims the job. Skips if the booking
 * is already assigned or the offer expired (no duplicate claim).
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { getSmsProvider, smsSenderId } from "@/providers/sms";
import { activeTokens } from "@/domain/cleaner/device-service";
import { getDispatchState } from "@/domain/dispatch/offer-service";
import { smsConfig } from "@/config";
import { serverEnv } from "@/lib/env";
import { logger } from "@/observability/logger";

export interface SmsFallbackResult {
  smsSent: number;
  skipped: boolean;
}

const SMS_ELIGIBLE_STATES = ["CREATED", "PUSH_SENT"]; // not VIEWED/ACCEPTED/DECLINED

export async function runOfferSmsFallback(bookingId: string): Promise<SmsFallbackResult> {
  const provider = getSmsProvider();
  if (!provider) {
    logger.info("sms-fallback.skipped.not_configured", { bookingId });
    return { smsSent: 0, skipped: true };
  }

  const state = await getDispatchState(bookingId);
  if (!state.exists || state.terminal || state.fullyAssigned) {
    return { smsSent: 0, skipped: true };
  }

  const db = serviceClient();
  const nowIso = new Date().toISOString();

  const { data: booking } = await db
    .from("bookings")
    .select("public_reference, property_bedrooms, zone:service_zones(name)")
    .eq("id", bookingId)
    .maybeSingle();
  const b: any = booking;
  const zoneName = b?.zone?.name ?? "your area";

  const { data: offers } = await db
    .from("job_offers")
    .select("id, cleaner_id, status, sms_sent_at, expires_at, metadata")
    .eq("booking_id", bookingId)
    .in("status", SMS_ELIGIBLE_STATES)
    .is("sms_sent_at", null)
    .gt("expires_at", nowIso);

  let smsSent = 0;
  const appUrl = serverEnv.appUrl();

  for (const offer of (offers ?? []) as any[]) {
    // Only fall back when push is not a sufficient channel: no active token, or
    // push was sent but the offer has not been viewed.
    const tokens = await activeTokens(offer.cleaner_id);
    const pushSufficient = tokens.length > 0 && offer.status === "PUSH_SENT";
    // If push was sent and delivered but simply unviewed, we still SMS after the
    // grace window; only skip when the cleaner has already engaged (VIEWED+).
    if (pushSufficient && offer.status !== "PUSH_SENT") continue;

    const { data: cleaner } = await db
      .from("cleaners")
      .select("phone_e164")
      .eq("id", offer.cleaner_id)
      .maybeSingle();
    if (!cleaner?.phone_e164) continue;

    const shortCode = offer.metadata?.sms_code ?? offer.id;
    const shortUrl = `${appUrl}/j/${shortCode}`;
    const body = `CLEANSE JOB: ${b?.property_bedrooms ?? ""}BR, ${zoneName}. Available? ${shortUrl}`;
    const clientReference = `off_${offer.id}`;
    const callbackUrl = `${appUrl}/api/v1/webhooks/sms`;

    try {
      const result = await provider.send({
        toE164: cleaner.phone_e164,
        senderId: smsSenderId(),
        body,
        callbackUrl,
        clientReference,
      });

      await db
        .from("job_offers")
        .update({ status: "SMS_SENT", sms_sent_at: nowIso })
        .eq("id", offer.id)
        .in("status", SMS_ELIGIBLE_STATES);

      await db.from("notifications").insert({
        booking_id: bookingId,
        cleaner_id: offer.cleaner_id,
        job_offer_id: offer.id,
        channel: "SMS",
        provider: provider.name,
        recipient: cleaner.phone_e164,
        template_code: "OFFER_SMS_FALLBACK",
        status: result.accepted ? "SENT" : "FAILED",
        provider_message_id: result.providerMessageId,
        estimated_cost_minor: result.estimatedCostMinor ?? smsConfig.unitCostKobo,
        sent_at: result.accepted ? nowIso : null,
        failed_at: result.accepted ? null : nowIso,
        payload: { body, client_reference: clientReference },
      });

      if (result.accepted) smsSent += 1;
    } catch (err) {
      logger.error("sms-fallback.send_failed", { bookingId, offerId: offer.id, error: String(err) });
      await db.from("notifications").insert({
        booking_id: bookingId,
        cleaner_id: offer.cleaner_id,
        job_offer_id: offer.id,
        channel: "SMS",
        provider: provider.name,
        recipient: cleaner.phone_e164,
        template_code: "OFFER_SMS_FALLBACK",
        status: "FAILED",
        failed_at: nowIso,
        failure_message: String(err),
      });
    }
  }

  return { smsSent, skipped: false };
}
