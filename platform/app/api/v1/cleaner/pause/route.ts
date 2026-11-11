import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { AppError } from "@/http/errors";
import { handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/cleaner/pause — disabled for cleaners (account status is operator-managed).
export async function POST(_req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireCleaner();
    throw new AppError(
      "FORBIDDEN",
      "Self-pause is disabled. Contact the Cleanse office if you need time off."
    );
  } catch (err) {
    return handleError(err, requestId);
  }
}
