import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import { registerDevice } from "@/domain/cleaner/device-service";
import { registerDeviceSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/cleaner/devices — register/update FCM token + device state.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireCleaner();
    const input = registerDeviceSchema.parse(await req.json());
    const result = await registerDevice(ctx.cleanerId, input);
    return ok(result, requestId, result.updated ? 200 : 201);
  } catch (err) {
    return handleError(err, requestId);
  }
}
