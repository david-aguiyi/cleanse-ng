import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { createInvoice } from "@/domain/invoice/invoice-service";
import { invoiceSaveSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/admin/invoices — first save of a new invoice; assigns its number.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const { data } = invoiceSaveSchema.parse(await req.json());
    const invoice = await createInvoice(data, admin);
    return ok(invoice, requestId, 201);
  } catch (err) {
    return handleError(err, requestId);
  }
}
