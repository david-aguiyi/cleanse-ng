/**
 * Supabase Auth server client bound to the request cookies (@supabase/ssr).
 * Used by admin/cleaner server components and route handlers to read the signed-in
 * session. This client is scoped to the user's session (RLS applies) and is
 * distinct from the privileged service client.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { serverEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(serverEnv.supabaseUrl(), serverEnv.supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where cookies are read-only. Session
          // refresh is handled by middleware, so this can be safely ignored.
        }
      },
    },
  });
}
