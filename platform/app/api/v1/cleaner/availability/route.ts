import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { setAvailability } from "@/domain/cleaner/cleaner-service";
import { availabilitySchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/v1/cleaner/availability — set AVAILABLE / UNAVAILABLE.
// Setting AVAILABLE is rejected unless the cleaner is ACTIVE + verified +
// deployment-ready (Stage 4 exit criterion).
export async function PUT(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireCleaner();
    const { available } = availabilitySchema.parse(await req.json());
    const result = await setAvailability(ctx.cleanerId, available);
    return ok(result, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
