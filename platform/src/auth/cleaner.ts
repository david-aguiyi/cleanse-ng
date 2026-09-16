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
    .select("id, full_name, account_status, verified, deployment_ready, availability")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!cleaner) return null;
  return {
    authUserId: user.id,
    cleanerId: cleaner.id,
    fullName: cleaner.full_name,
    accountStatus: cleaner.account_status,
    verified: cleaner.verified,
    deploymentReady: cleaner.deployment_ready,
    availability: cleaner.availability,
  };
}

export async function requireCleaner(): Promise<CleanerContext> {
  const ctx = await getCleanerContext();
  if (!ctx) throw new AppError("UNAUTHORIZED", "Please sign in to your cleaner account.");
  return ctx;
}
