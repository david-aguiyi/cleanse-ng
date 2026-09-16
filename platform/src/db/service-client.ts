/**
 * Supabase service-role client. SERVER-ONLY.
 *
 * This client bypasses RLS and performs privileged writes for the trusted
 * domain services (Blueprint §6). It must never be imported into a client
 * component — `server-only` enforces that at build time.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

// Schema generic is `any` until generated Supabase types are wired in, so
// select() returns `any` rather than the string-literal-parsed union. Replace
// `any` with a generated `Database` type in a later hardening pass for full
// end-to-end column typing.
type LooseClient = SupabaseClient<any, "public", any>;

let cached: LooseClient | null = null;

export function serviceClient(): LooseClient {
  if (cached) return cached;
  cached = createClient<any, "public", any>(
    serverEnv.supabaseUrl(),
    serverEnv.supabaseServiceRoleKey(),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-cleanse-role": "service" } },
    }
  );
  return cached;
}
