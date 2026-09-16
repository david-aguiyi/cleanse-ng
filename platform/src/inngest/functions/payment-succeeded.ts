/**
 * Durable payment finalization (Blueprint §8.2, §13). Triggered by the Paystack
 * webhook so the HTTP handler can return 200 promptly while verification runs in
 * a retriable step. Idempotent by provider reference — the browser callback may
 * have finalized already.
 */
import { inngest } from "../client";
import { finalizePaystackPayment } from "@/domain/payment/payment-service";

export const paymentSucceeded = inngest.createFunction(
  { id: "payment-succeeded", retries: 4 },
  { event: "paystack/payment.succeeded" },
  async ({ event, step }) => {
    const reference = event.data.reference;
    const result = await step.run("finalize-paystack-payment", async () => {
      return finalizePaystackPayment(reference);
    });
    // finalize emits booking/confirmed itself (once) via emitBookingConfirmed.
    return { reference, alreadyFinalized: result.alreadyFinalized };
  }
);
