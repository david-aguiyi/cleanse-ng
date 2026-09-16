/**
 * Rate limiting (Blueprint §14). Quote, booking, payment-init and offer-accept
 * endpoints get IP/user limits.
 *
 * This is an in-memory fixed-window limiter — correct for a single instance and
 * good enough for the pilot. For multi-instance production, back it with a shared
 * store (e.g. Upstash Redis) behind the same `enforceRateLimit` signature.
 */
import type { NextRequest } from "next/server";
import { AppError } from "./errors";

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Throws RATE_LIMITED when more than `limit` calls happen within `windowMs`. */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  existing.count += 1;
  if (existing.count > limit) {
    throw new AppError("RATE_LIMITED", "Too many requests. Please slow down and try again.");
  }

  // Opportunistic cleanup so the map does not grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
}

/** Convenience: rate limit a route by client IP. */
export function rateLimitByIp(req: NextRequest, route: string, limit: number, windowMs: number): void {
  enforceRateLimit(`${route}:${getClientIp(req)}`, limit, windowMs);
}
