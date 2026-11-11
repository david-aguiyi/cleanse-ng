import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { getInvoiceJob } from "@/domain/job/invoice-job-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/jobs/{id} — full operational detail, cleaner split, and visit log.
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const data = await getInvoiceJob(ctx.params.id);
    return ok(data, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

