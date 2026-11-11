import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { updateInvoiceJobCleaners } from "@/domain/job/invoice-job-service";
import { updateInvoiceJobCleanersSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/v1/admin/jobs/{id}/cleaners — assign up to 2 onboarded Cleanse Pros.
export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const { cleaner_ids } = updateInvoiceJobCleanersSchema.parse(await req.json());
    const res = await updateInvoiceJobCleaners(ctx.params.id, cleaner_ids, admin);
    return ok(res, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

