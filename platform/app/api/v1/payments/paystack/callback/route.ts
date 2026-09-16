import { NextRequest, NextResponse } from "next/server";
import { finalizePaystackPayment } from "@/domain/payment/payment-service";
import { serverEnv } from "@/lib/env";
import { newRequestId, logger } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/payments/paystack/callback — Paystack redirects the browser here
// after checkout. We finalize (idempotently) and redirect to the confirmation
// page. The webhook is the durable path; this improves the customer's UX
// (Blueprint §8.2).
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");
  const appUrl = serverEnv.appUrl();

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/booking/error?reason=missing_reference`);
  }

  try {
    const result = await finalizePaystackPayment(reference);
    logger.info("payment.callback.finalized", {
      requestId,
      reference,
      alreadyFinalized: result.alreadyFinalized,
    });
    return NextResponse.redirect(
      `${appUrl}/booking/${encodeURIComponent(result.bookingReference)}/confirmed`
    );
  } catch (err) {
    // Verification failed / mismatch — do not confirm. Send to a safe page.
    logger.warn("payment.callback.failed", { requestId, reference, error: String(err) });
    return NextResponse.redirect(`${appUrl}/booking/error?reason=verification_failed`);
  }
}
