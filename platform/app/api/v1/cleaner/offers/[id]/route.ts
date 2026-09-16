import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { getOfferForCleaner } from "@/domain/assignment/assignment-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/cleaner/offers/{id} — offer detail; marks the offer viewed.
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const cleaner = await requireCleaner();
    const offer = await getOfferForCleaner(ctx.params.id, cleaner.cleanerId);
    return ok(offer, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
