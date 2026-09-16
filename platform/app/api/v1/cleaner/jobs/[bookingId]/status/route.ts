import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { updateJobStatus } from "@/domain/job/job-service";
import { jobStatusSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/cleaner/jobs/{bookingId}/status — ON_THE_WAY / ARRIVED /
// IN_PROGRESS / COMPLETED (Blueprint §7). Forward-only; assigned cleaner only.
export async function POST(req: NextRequest, ctx: { params: { bookingId: string } }) {
  const requestId = newRequestId();
  try {
    const cleaner = await requireCleaner();
    const { status } = jobStatusSchema.parse(await req.json());
    const result = await updateJobStatus(ctx.params.bookingId, cleaner.cleanerId, status);
    return ok(result, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
