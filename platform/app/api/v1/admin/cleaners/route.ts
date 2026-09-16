import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { listCleaners, createCleaner } from "@/domain/cleaner/cleaner-service";
import { createCleanerSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/cleaners — search/manage the cleaner network.
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const cleaners = await listCleaners({
      status: sp.get("status") ?? undefined,
      search: sp.get("q") ?? undefined,
    });
    return ok({ cleaners }, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

// POST /api/v1/admin/cleaners — onboard a cleaner (creates Auth account + profile).
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    const input = createCleanerSchema.parse(await req.json());
    const result = await createCleaner(input, admin);
    return ok(result, requestId, 201);
  } catch (err) {
    return handleError(err, requestId);
  }
}
