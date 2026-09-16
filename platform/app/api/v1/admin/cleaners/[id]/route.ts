import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { getCleanerAdmin, updateCleaner } from "@/domain/cleaner/cleaner-service";
import { updateCleanerSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/cleaners/{id} — cleaner profile + zones/services.
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const cleaner = await getCleanerAdmin(ctx.params.id);
    return ok(cleaner, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

// PATCH /api/v1/admin/cleaners/{id} — approve/suspend/verify/deployment + skills.
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    const patch = updateCleanerSchema.parse(await req.json());
    const cleaner = await updateCleaner(ctx.params.id, patch, admin);
    return ok(cleaner, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
