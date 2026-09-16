/**
 * Central configuration. Pilot defaults are read from environment so operations
 * can tune them without a code deployment (Blueprint §4 Configurability, §10.2).
 */

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const appConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  currency: "NGN",
  timezone: "Africa/Lagos",
  quoteTtlSeconds: num("QUOTE_TTL_SECONDS", 600), // 10 min quote validity
} as const;

/** Configurable dispatch policy — starting values, not product promises. */
export const dispatchConfig = {
  round1Size: num("DISPATCH_ROUND_1_SIZE", 5),
  pushGraceSeconds: num("DISPATCH_PUSH_GRACE_SECONDS", 60),
  round2AfterSeconds: num("DISPATCH_ROUND_2_AFTER_SECONDS", 120),
  round2Size: num("DISPATCH_ROUND_2_SIZE", 10),
  offerTtlSeconds: num("DISPATCH_OFFER_TTL_SECONDS", 300),
  escalationSeconds: num("DISPATCH_ESCALATION_SECONDS", 300),
} as const;

/** Feature flags. Kept here so build order stages can be toggled per environment. */
export const featureFlags = {
  paystackEnabled: Boolean(process.env.PAYSTACK_SECRET_KEY),
  asapBookingEnabled: process.env.FEATURE_ASAP_BOOKING === "true",
} as const;
