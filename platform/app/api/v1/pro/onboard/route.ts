import { NextRequest } from "next/server";
import { submitOnboarding } from "@/domain/cleaner/onboarding-service";
import { cleanerOnboardingSchema } from "@/validation/schemas";
import { rateLimitByIp, getClientIp } from "@/http/rate-limit";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    // Rate limit: max 5 submissions per IP per 10 minutes
    rateLimitByIp(req, "onboard", 5, 10 * 60 * 1000);

    const ip = getClientIp(req);
    const json = await req.json();
    const input = cleanerOnboardingSchema.parse(json);
    const userAgent = req.headers.get("user-agent") ?? undefined;

    const result = await submitOnboarding(input, { ip, userAgent });
    return ok(result, requestId, 201);
  } catch (err) {
    return handleError(err, requestId);
  }
}
