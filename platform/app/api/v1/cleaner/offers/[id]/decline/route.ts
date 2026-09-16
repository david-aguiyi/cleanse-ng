import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { declineOffer } from "@/domain/assignment/assignment-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/cleaner/offers/{id}/decline — decline an active offer.
export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const cleaner = await requireCleaner();
    await declineOffer(ctx.params.id, cleaner.cleanerId);
    return ok({ result: "DECLINED" }, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
