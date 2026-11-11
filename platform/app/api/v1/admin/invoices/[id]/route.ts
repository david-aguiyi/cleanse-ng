import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { deleteInvoice, updateInvoice } from "@/domain/invoice/invoice-service";
import { invoiceSaveSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/v1/admin/invoices/{id} — save changes; the invoice keeps its number.
export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const { data, num } = invoiceSaveSchema.parse(await req.json());
    const invoice = await updateInvoice(ctx.params.id, data, admin, num);
    return ok(invoice, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

// DELETE /api/v1/admin/invoices/{id} — remove an invoice and release its reserved calendar slots.
export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const deleted = await deleteInvoice(ctx.params.id);
    return ok(deleted, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
