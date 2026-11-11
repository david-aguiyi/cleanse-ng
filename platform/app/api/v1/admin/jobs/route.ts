import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { listInvoiceJobs } from "@/domain/job/invoice-job-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/jobs — list invoice-linked recurring/one-off jobs.
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const search = req.nextUrl.searchParams.get("q") || undefined;
    const result = await listInvoiceJobs({ status, search });
    return ok(result, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

