import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { clearApplications } from "@/domain/applicant/applicant-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/admin/applicants/clear — purge applications for a fresh batch/testing.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    let status: string | undefined;
    try {
      const body = await req.json();
      status = body?.status;
    } catch {}
    const res = await clearApplications({ status });
    return ok(res, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

