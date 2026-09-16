import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/db/service-client";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SMS short-link resolver (Blueprint §9.5). Maps a short code to the cleaner
 * offer page. GET only — it opens the authenticated offer page and NEVER claims
 * the job. The cleaner must be signed in (middleware gates /cleaner) and press
 * I'M AVAILABLE to claim.
 */
export async function GET(_req: NextRequest, ctx: { params: { code: string } }) {
  const appUrl = serverEnv.appUrl();
  const { data: offer } = await serviceClient()
    .from("job_offers")
    .select("id")
    .eq("metadata->>sms_code", ctx.params.code)
    .maybeSingle();

  if (!offer) {
    return NextResponse.redirect(`${appUrl}/cleaner/home`);
  }
  return NextResponse.redirect(`${appUrl}/cleaner/offers/${offer.id}`);
}
