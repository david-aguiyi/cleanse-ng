import { NextRequest } from "next/server";
import { quoteRequestSchema } from "@/validation/schemas";
import { createQuote } from "@/domain/pricing/pricing-service";
import { ok, handleError } from "@/http/response";
import { rateLimitByIp } from "@/http/rate-limit";
import { newRequestId, logger } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/quotes — calculate a server-authoritative quote (Blueprint §7.2).
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    rateLimitByIp(req, "quotes", 30, 60_000);
    const body = await req.json();
    const input = quoteRequestSchema.parse(body);
    const quote = await createQuote(input);
    logger.info("quote.created", { requestId, quoteId: quote.quoteId, totalKobo: quote.totalKobo });

    return ok(
      {
        quote_id: quote.quoteId,
        currency: quote.currency,
        subtotal_kobo: quote.subtotalKobo,
        extras_kobo: quote.extrasKobo,
        total_kobo: quote.totalKobo,
        display_total: quote.displayTotal,
        line_items: quote.lineItems,
        expires_at: quote.expiresAt,
      },
      requestId
    );
  } catch (err) {
    return handleError(err, requestId);
  }
}
