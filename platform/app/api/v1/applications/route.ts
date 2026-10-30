import { NextRequest } from "next/server";
import { cleanerApplicationSchema } from "@/validation/schemas";
import { submitApplication } from "@/domain/applicant/applicant-service";
import { ok, handleError } from "@/http/response";
import { rateLimitByIp, getClientIp } from "@/http/rate-limit";
import { newRequestId, logger } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/applications — public "Become a Cleanse Pro" form submission.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    rateLimitByIp(req, "applications", 5, 10 * 60_000);
    const input = cleanerApplicationSchema.parse(await req.json());
    const { id } = await submitApplication(input, getClientIp(req));
    logger.info("application.submitted", { requestId, applicationId: id });
    return ok({ received: true }, requestId, 201);
  } catch (err) {
    return handleError(err, requestId);
  }
}
