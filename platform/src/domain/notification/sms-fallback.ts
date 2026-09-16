/**
 * SMS fallback seam (Blueprint §9.4, §13 offer.push-fallback).
 *
 * Stage 7 wires the dispatch flow to call this after the push grace period.
 * Stage 8 implements the actual BulkSMSNigeria send behind the SmsProvider
 * adapter. Until then this is a safe no-op so dispatch never fails on it.
 */
import "server-only";
import { logger } from "@/observability/logger";

export interface SmsFallbackResult {
  smsSent: number;
  skipped: boolean;
}

export async function runOfferSmsFallback(bookingId: string): Promise<SmsFallbackResult> {
  // TODO(Stage 8): for each still-active offer with no valid push / no response,
  // send an SMS via the provider adapter and record a notification row.
  logger.info("sms-fallback.noop (implemented in Stage 8)", { bookingId });
  return { smsSent: 0, skipped: true };
}
