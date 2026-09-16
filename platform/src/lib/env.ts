/**
 * Server-only environment access. Throws early if a required secret is missing
 * so misconfiguration surfaces at boot, not mid-transaction (Blueprint §14).
 *
 * Importing this module from a client component will (correctly) fail, because
 * the server-only secrets are not exposed to the browser bundle.
 */
import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const serverEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),

  paystackSecretKey: () => required("PAYSTACK_SECRET_KEY"),
  paystackPublicKey: () => optional("PAYSTACK_PUBLIC_KEY"),

  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};
