import { NextResponse } from "next/server";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/health — liveness probe with build/feature visibility.
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      status: "up",
      paystack_configured: Boolean(process.env.PAYSTACK_SECRET_KEY),
      supabase_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
    request_id: newRequestId(),
  });
}
