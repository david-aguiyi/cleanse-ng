import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings } from "@/domain/settings/settings-service";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  const settings = await getSiteSettings();

  const res = NextResponse.json({
    ok: true,
    data: {
      whatsapp: {
        raw: settings.whatsapp.raw,
        digits: settings.whatsapp.digits,
        international: settings.whatsapp.international,
        display: settings.whatsapp.display,
        local_display: settings.whatsapp.localDisplay,
        wa_url: settings.whatsapp.waUrl,
      },
      updated_at: settings.updatedAt,
    },
    request_id: requestId,
  });

  res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  return res;
}
