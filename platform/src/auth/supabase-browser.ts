"use client";

/**
 * Supabase Auth browser client (@supabase/ssr). Used only by the admin/cleaner
 * sign-in UI. Uses the publishable key — never a service role key.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
