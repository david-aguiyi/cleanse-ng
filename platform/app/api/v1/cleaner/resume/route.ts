import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { AppError } from "@/http/errors";
import { handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/cleaner/resume — disabled for cleaners (account status is operator-managed).
export async function POST(_req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireCleaner();
    throw new AppError(
      "FORBIDDEN",
      "Self-resume is disabled. Contact the Cleanse office to reactivate your account."
    );
  } catch (err) {
    return handleError(err, requestId);
  }
}
