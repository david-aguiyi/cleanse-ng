/**
 * Paystack provider adapter (Blueprint §8). All calls are server-side; the
 * secret key never reaches the browser.
 */
import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";
import { AppError } from "@/http/errors";

const BASE_URL = "https://api.paystack.co";

export interface PaystackInitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackVerifyResult {
  status: string; // 'success' when paid
  reference: string;
  amountKobo: number;
  currency: string;
  channel: string | null;
  paidAt: string | null;
  transactionId: number | null;
  raw: unknown;
}

/** Initialize a transaction. Amount is in kobo; metadata carries booking ref only. */
export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  bookingReference: string;
}): Promise<PaystackInitResult> {
  const res = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.paystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      currency: "NGN",
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: { booking_reference: params.bookingReference },
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | { status?: boolean; message?: string; data?: { authorization_url: string; access_code: string; reference: string } }
    | null;

  if (!res.ok || !json?.status || !json.data) {
    throw new AppError("PAYMENT_INIT_FAILED", json?.message ?? "Could not start payment.");
  }
  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

/** Verify a transaction by reference — the final authority before CONFIRMED. */
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
  const res = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${serverEnv.paystackSecretKey()}` },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | {
        status?: boolean;
        message?: string;
        data?: {
          status: string;
          reference: string;
          amount: number;
          currency: string;
          channel: string | null;
          paid_at: string | null;
          id: number | null;
        };
      }
    | null;

  if (!res.ok || !json?.status || !json.data) {
    throw new AppError("PAYMENT_VERIFICATION_FAILED", json?.message ?? "Could not verify payment.");
  }
  const d = json.data;
  return {
    status: d.status,
    reference: d.reference,
    amountKobo: d.amount,
    currency: d.currency,
    channel: d.channel,
    paidAt: d.paid_at,
    transactionId: d.id,
    raw: json.data,
  };
}

/**
 * Verify the x-paystack-signature header (HMAC SHA512 over the raw body) in
 * constant time (Blueprint §8.3).
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha512", serverEnv.paystackSecretKey())
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature ?? "", "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
