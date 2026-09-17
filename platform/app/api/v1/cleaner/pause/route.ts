import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { pauseSelf } from "@/domain/cleaner/cleaner-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/cleaner/pause — cleaner stops receiving jobs (self-pause).
export async function POST(_req: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireCleaner();
    const result = await pauseSelf(ctx.cleanerId);
    return ok(result, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
