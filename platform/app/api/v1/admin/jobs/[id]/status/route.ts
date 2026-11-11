import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { updateInvoiceJobStatus } from "@/domain/job/invoice-job-service";
import { invoiceJobStatusSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/v1/admin/jobs/{id}/status — transition PENDING / ACTIVE / PAUSED / ENDED / TERMINATED.
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const { status, reason } = invoiceJobStatusSchema.parse(await req.json());
    const res = await updateInvoiceJobStatus(ctx.params.id, status, admin, reason);
    return ok(res, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

