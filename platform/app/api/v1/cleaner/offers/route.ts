import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { listOffers } from "@/domain/assignment/assignment-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/cleaner/offers — active/recent offers for the cleaner.
export async function GET(_req: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireCleaner();
    const offers = await listOffers(ctx.cleanerId);
    return ok({ offers }, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
