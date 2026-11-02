import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/admin";
import { getSiteSettings, updateWhatsappSetting } from "@/domain/settings/settings-service";
import { updateSettingsSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const settings = await getSiteSettings();
    return ok(settings, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "OPERATIONS"]);
    const body = updateSettingsSchema.parse(await req.json());
    const updated = await updateWhatsappSetting(body.whatsapp_number, admin.adminId);
    return ok(updated, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}
