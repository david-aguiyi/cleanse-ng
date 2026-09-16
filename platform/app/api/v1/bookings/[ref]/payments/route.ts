import { NextRequest } from "next/server";
import { initPaymentSchema } from "@/validation/schemas";
import { initializePaystack } from "@/domain/payment/payment-service";
import { ok, handleError } from "@/http/response";
import { newRequestId, logger } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/bookings/{ref}/payments — initialize a Paystack transaction
// (Blueprint §7 / §8.1). Client submits the booking reference only; the server
// reloads the authoritative total from Postgres.
export async function POST(req: NextRequest, ctx: { params: { ref: string } }) {
  const requestId = newRequestId();
  try {
    const body = await req.json().catch(() => ({}));
    const { callback_path } = initPaymentSchema.parse(body);
    const result = await initializePaystack(ctx.params.ref, callback_path);
    logger.info("payment.initialized", { requestId, reference: ctx.params.ref });

    return ok(
      {
        authorization_url: result.authorizationUrl,
        access_code: result.accessCode,
        provider_reference: result.providerReference,
      },
      requestId
    );
  } catch (err) {
    return handleError(err, requestId);
  }
}
