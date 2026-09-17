/**
 * Cleaner authorization. The signed-in Supabase Auth user is mapped to a
 * cleaners row. Cleaners have a persistent PWA session (Blueprint §6.1). Job
 * data is never shown before auth.
 */
import "server-only";
import { createServerSupabase } from "./supabase-server";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";

export interface CleanerContext {
  authUserId: string;
  cleanerId: string;
  fullName: string;
  accountStatus: string;
  blockReason: string | null;
  verified: boolean;
  deploymentReady: boolean;
  availability: string;
}

export async function getCleanerContext(): Promise<CleanerContext | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: cleaner } = await serviceClient()
    .from("cleaners")
    .select("id, full_name, account_status, block_reason, verified, deployment_ready, availability")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!cleaner) return null;
  return {
    authUserId: user.id,
    cleanerId: cleaner.id,
    fullName: cleaner.full_name,
    accountStatus: cleaner.account_status,
    blockReason: cleaner.block_reason ?? null,
    verified: cleaner.verified,
    deploymentReady: cleaner.deployment_ready,
    availability: cleaner.availability,
  };
}

/**
 * API guard. Rejects unauthenticated callers, and blocks SUSPENDED cleaners from
 * every cleaner action (they can still see the "blocked" screen via the pages).
 */
export async function requireCleaner(): Promise<CleanerContext> {
  const ctx = await getCleanerContext();
  if (!ctx) throw new AppError("UNAUTHORIZED", "Please sign in to your cleaner account.");
  if (ctx.accountStatus === "SUSPENDED") {
    throw new AppError("FORBIDDEN", "Your account has been blocked. Please contact the office.");
  }
  return ctx;
}
