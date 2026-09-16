/**
 * Push gateway (Blueprint Appendix B.2 PushGateway, §9.3 payload).
 *
 * Sends only customer-safe offer data — offer id, service, broad zone, time,
 * earnings, deep link. NEVER exact address or customer phone (§9.2, §14).
 * Invalid/unregistered tokens are marked inactive so dispatch falls back to SMS.
 */
import "server-only";
import { adminMessaging, firebaseAdminConfigured } from "./admin";
import { markTokenInactive } from "@/domain/cleaner/device-service";
import { serverEnv } from "@/lib/env";
import { logger } from "@/observability/logger";

const INVALID_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export interface JobOfferPush {
  title: string;
  body: string;
  offerId: string;
  bookingReference: string;
  deepLinkPath: string; // e.g. /cleaner/offers/<id>
}

export interface PushSendResult {
  attempted: number;
  delivered: number;
  invalidated: number;
  configured: boolean;
}

/** Send a data+notification message to one cleaner's active tokens. */
export async function sendToTokens(tokens: string[], msg: JobOfferPush): Promise<PushSendResult> {
  if (!firebaseAdminConfigured()) {
    logger.warn("push.skipped.not_configured", { offerId: msg.offerId });
    return { attempted: tokens.length, delivered: 0, invalidated: 0, configured: false };
  }
  if (tokens.length === 0) {
    return { attempted: 0, delivered: 0, invalidated: 0, configured: true };
  }

  const link = `${serverEnv.appUrl()}${msg.deepLinkPath}`;
  const messaging = adminMessaging();

  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: msg.title, body: msg.body },
    data: {
      type: "JOB_OFFER",
      offer_id: msg.offerId,
      booking_reference: msg.bookingReference,
      deep_link: link,
    },
    webpush: { fcmOptions: { link } },
  });

  let invalidated = 0;
  await Promise.all(
    res.responses.map(async (r, i) => {
      if (!r.success) {
        const code = (r.error as { code?: string } | undefined)?.code ?? "";
        if (INVALID_CODES.has(code)) {
          invalidated += 1;
          await markTokenInactive(tokens[i]!);
        }
      }
    })
  );

  return {
    attempted: tokens.length,
    delivered: res.successCount,
    invalidated,
    configured: true,
  };
}
