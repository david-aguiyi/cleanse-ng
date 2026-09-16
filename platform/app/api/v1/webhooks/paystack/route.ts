import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  sha256,
} from "@/providers/paystack/paystack-client";
import { storeOnce } from "@/providers/webhook-register";
import { finalizePaystackPayment } from "@/domain/payment/payment-service";
import { inngest } from "@/inngest/client";
import { newRequestId, logger } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/webhooks/paystack — HMAC-SHA512 verified webhook (Blueprint §8.3).
// Returns 200 promptly. Transaction verification (inside finalize) remains the
// final authority before a booking becomes CONFIRMED.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    logger.warn("paystack.webhook.invalid_signature", { requestId });
    return new NextResponse("invalid signature", { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; id?: number } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("bad payload", { status: 400 });
  }

  // Record once, keyed by payload hash — replays are recognised as no-ops.
  const { firstSeen } = await storeOnce({
    provider: "PAYSTACK",
    payloadHash: sha256(raw),
    eventType: event.event,
    reference: event.data?.reference,
    providerEventId: event.data?.id ? String(event.data.id) : undefined,
    payload: event,
  });

  if (!firstSeen) {
    logger.info("paystack.webhook.duplicate", { requestId, event: event.event });
    return new NextResponse("ok", { status: 200 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    const reference = event.data.reference;
    // Enqueue durable finalization so the webhook returns 200 promptly and heavy
    // work is checkpointed/retriable (Blueprint §8.3, §13).
    try {
      await inngest.send({ name: "paystack/payment.succeeded", data: { reference } });
    } catch (enqueueErr) {
      // Never lose a paid booking (§4): fall back to inline finalization.
      logger.error("paystack.webhook.enqueue_failed_fallback_inline", {
        requestId,
        reference,
        error: String(enqueueErr),
      });
      try {
        await finalizePaystackPayment(reference);
      } catch (finalErr) {
        logger.error("paystack.webhook.finalize_failed", {
          requestId,
          reference,
          error: String(finalErr),
        });
      }
    }
  }

  return new NextResponse("ok", { status: 200 });
}
