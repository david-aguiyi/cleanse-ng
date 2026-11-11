import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { setCleanerPassword } from "@/domain/cleaner/cleaner-service";
import { setCleanerPasswordSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/admin/cleaners/{id}/password — set/reset cleaner login password and store admin-only copy.
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    const body = setCleanerPasswordSchema.parse(await req.json());
    const result = await setCleanerPassword(ctx.params.id, body.password, admin);
    return ok(result, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

