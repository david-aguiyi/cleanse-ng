import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/auth/admin";
import { listPublicBookedSlots } from "@/domain/invoice/invoice-service";
import { handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/public/availability — anonymized booked calendar slots
// aggregated from saved active invoices and confirmed online bookings.
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const excludeParam = req.nextUrl.searchParams.get("exclude_invoice");
    let excludeInvoiceId: string | null = null;
    if (excludeParam) {
      const admin = await getAdminContext();
      if (admin) excludeInvoiceId = excludeParam;
    }

    const result = await listPublicBookedSlots({ excludeInvoiceId });
    const res = NextResponse.json({
      ok: true,
      data: {
        slots: result.slots,
        generated_at: result.generatedAt,
      },
      request_id: requestId,
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return res;
  } catch (err) {
    return handleError(err, requestId);
  }
}

