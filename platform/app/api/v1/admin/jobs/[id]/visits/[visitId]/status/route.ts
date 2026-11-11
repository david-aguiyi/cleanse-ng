import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { markInvoiceVisitStatus } from "@/domain/job/invoice-job-service";
import { markVisitServedSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/admin/jobs/{id}/visits/{visitId}/status — mark Served/Unserved/Cancelled.
export async function POST(
  req: NextRequest,
  ctx: { params: { id: string; visitId: string } }
) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const input = markVisitServedSchema.parse(await req.json());
    const res = await markInvoiceVisitStatus(ctx.params.id, ctx.params.visitId, input, admin);
    return ok(res, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

