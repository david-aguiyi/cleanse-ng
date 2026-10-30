import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { updateApplication } from "@/domain/applicant/applicant-service";
import { updateApplicationSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/v1/admin/applicants/{id} — change review status and/or add a note.
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    const patch = updateApplicationSchema.parse(await req.json());
    const application = await updateApplication(ctx.params.id, patch, admin);
    return ok({ status: application.status, admin_notes: application.admin_notes }, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
