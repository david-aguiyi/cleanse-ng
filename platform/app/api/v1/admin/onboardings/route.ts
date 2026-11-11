import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { listOnboardings } from "@/domain/cleaner/onboarding-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const onboardings = await listOnboardings({
      status: sp.get("status") ?? undefined,
      search: sp.get("q") ?? undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    });
    return ok({ onboardings }, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

