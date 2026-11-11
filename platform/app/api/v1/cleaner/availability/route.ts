import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { AppError } from "@/http/errors";
import { handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/v1/cleaner/availability — disabled for cleaners (schedules are operator-assigned).
export async function PUT(_req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireCleaner();
    throw new AppError(
      "FORBIDDEN",
      "Availability toggles are disabled. Your schedule is assigned directly by the Cleanse office."
    );
  } catch (err) {
    return handleError(err, requestId);
  }
}
