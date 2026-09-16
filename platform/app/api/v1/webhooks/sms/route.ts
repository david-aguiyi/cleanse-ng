import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/db/service-client";
import { newRequestId, logger } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SMS delivery status callback (Blueprint §7 POST /webhooks/sms, §13 sms.delivery).
 * Verified by a shared secret. Maps the provider message id to a notification row
 * and updates its delivery state. Returns 200 quickly.
 */
function statusFor(raw: string): "DELIVERED" | "FAILED" | null {
  const s = raw.toUpperCase();
  if (["DELIVERED", "DELIVRD", "SUCCESS", "SENT"].some((k) => s.includes(k))) return "DELIVERED";
  if (["FAILED", "UNDELIV", "REJECT", "EXPIRED"].some((k) => s.includes(k))) return "FAILED";
  return null;
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const secret = process.env.SMS_DELIVERY_CALLBACK_SECRET;
  const provided = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-sms-secret");
  if (secret && provided !== secret) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Some providers post form-encoded; fall back to query params.
    req.nextUrl.searchParams.forEach((v, k) => (body[k] = v));
  }

  const messageId = String(
    body.message_id ?? body.messageId ?? body.id ?? req.nextUrl.searchParams.get("message_id") ?? ""
  );
  const rawStatus = String(body.status ?? body.dlr_status ?? req.nextUrl.searchParams.get("status") ?? "");
  const mapped = statusFor(rawStatus);

  if (!messageId || !mapped) {
    return new NextResponse("ignored", { status: 200 });
  }

  const db = serviceClient();
  const nowIso = new Date().toISOString();
  await db
    .from("notifications")
    .update(
      mapped === "DELIVERED"
        ? { status: "DELIVERED", delivered_at: nowIso }
        : { status: "FAILED", failed_at: nowIso, failure_code: rawStatus }
    )
    .eq("provider_message_id", messageId)
    .eq("channel", "SMS");

  logger.info("sms.delivery", { requestId, messageId, status: mapped });
  return new NextResponse("ok", { status: 200 });
}
