import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/auth/admin";
import { approveAndCreateCleaner } from "@/domain/cleaner/onboarding-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const approveSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  zone_codes: z.array(z.string()).default([]),
  service_codes: z.array(z.string()).default(["REGULAR"]),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    const body = approveSchema.parse(await req.json());
    const result = await approveAndCreateCleaner(ctx.params.id, body, admin);
    return ok(result, requestId, 201);
  } catch (err) {
    return handleError(err, requestId);
  }
}

