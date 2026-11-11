import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { getOnboarding, updateOnboardingReview, deleteOnboarding } from "@/domain/cleaner/onboarding-service";
import { updateOnboardingReviewSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const data = await getOnboarding(ctx.params.id);
    return ok(data, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    const patch = updateOnboardingReviewSchema.parse(await req.json());
    const data = await updateOnboardingReview(ctx.params.id, patch, admin);
    return ok(data, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    const res = await deleteOnboarding(ctx.params.id);
    return ok(res, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

