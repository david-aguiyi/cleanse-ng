/**
 * Cleaner share card + WhatsApp handoff (Blueprint §12). Generates a high-entropy
 * token (only its hash is stored), a short-lived customer-safe cleaner profile
 * URL, and a prefilled wa.me link. The admin remains the sender — no WhatsApp API.
 */
import "server-only";
import crypto from "node:crypto";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import { shareCardConfig } from "@/config";
import { serverEnv } from "@/lib/env";
import type { AdminContext } from "@/auth/admin";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface ShareCardResult {
  url: string;
  waUrl: string;
  expiresAt: string;
}

/** Create (or refresh) a share card for a booking's assigned cleaner. */
export async function createShareCard(bookingId: string, admin: AdminContext): Promise<ShareCardResult> {
  const db = serviceClient();

  const { data: booking } = await db
    .from("bookings")
    .select(
      "id, public_reference, assigned_cleaner_id, scheduled_start_at, customer:customers(full_name, whatsapp_e164)"
    )
    .eq("id", bookingId)
    .maybeSingle();
  const b: any = booking;
  if (!b) throw new AppError("BOOKING_NOT_FOUND", "Booking not found.");
  if (!b.assigned_cleaner_id) {
    throw new AppError("CLEANER_NOT_FOUND", "No cleaner is assigned to this booking yet.");
  }

  const { data: cleaner } = await db
    .from("cleaners")
    .select("full_name, cleaner_code")
    .eq("id", b.assigned_cleaner_id)
    .maybeSingle();
  if (!cleaner) throw new AppError("CLEANER_NOT_FOUND", "Assigned cleaner not found.");

  // Revoke any prior active cards for this booking, then mint a fresh one.
  await db
    .from("cleaner_share_cards")
    .update({ revoked_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .is("revoked_at", null);

  const token = crypto.randomBytes(24).toString("base64url");
  const scheduled = new Date(b.scheduled_start_at).getTime();
  const base = Math.max(scheduled, Date.now());
  const expiresAt = new Date(base + shareCardConfig.ttlHours * 3600 * 1000).toISOString();

  await db.from("cleaner_share_cards").insert({
    booking_id: bookingId,
    cleaner_id: b.assigned_cleaner_id,
    token_hash: hashToken(token),
    expires_at: expiresAt,
    created_by: admin.adminId,
  });

  const appUrl = serverEnv.appUrl();
  const url = `${appUrl}/c/cleaner/${token}`;

  const firstName = String(b.customer?.full_name ?? "").split(" ")[0] ?? "there";
  const waDigits = String(b.customer?.whatsapp_e164 ?? "").replace(/[^\d]/g, "");
  const text = encodeURIComponent(
    `Hi ${firstName}, your Cleanse professional for today is ${cleaner.full_name}.\n\n` +
      `Cleaner ID: ${cleaner.cleaner_code}\n` +
      `Profile: ${url}\n\n` +
      `We are available if you need anything regarding your booking ${b.public_reference}.`
  );
  const waUrl = `https://wa.me/${waDigits}?text=${text}`;

  await db.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "admin.cleaner_share_card_created",
    actor_type: "ADMIN",
    actor_id: admin.adminId,
    data: { cleaner_id: b.assigned_cleaner_id },
  });
  await db.from("audit_logs").insert({
    actor_auth_user_id: admin.authUserId,
    action: "cleaner.share_card_created",
    entity_type: "booking",
    entity_id: bookingId,
    after_data: { expires_at: expiresAt },
  });

  return { url, waUrl, expiresAt };
}

export interface PublicCleanerCard {
  full_name: string;
  cleaner_code: string;
  bio: string | null;
  photo_path: string | null;
  rating: number | null;
  completed_jobs: number;
  verified: boolean;
}

/** Resolve a share token to a customer-safe cleaner card, or null if invalid. */
export async function getShareCardByToken(token: string): Promise<PublicCleanerCard | null> {
  const db = serviceClient();
  const { data: card } = await db
    .from("cleaner_share_cards")
    .select("cleaner_id, expires_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!card || card.revoked_at || new Date(card.expires_at).getTime() < Date.now()) {
    return null;
  }

  const { data: cleaner } = await db
    .from("cleaners")
    // Customer-safe allow-list only — no phone, internal notes or complaint data.
    .select("full_name, cleaner_code, bio, photo_path, rating, completed_jobs, verified")
    .eq("id", card.cleaner_id)
    .maybeSingle();
  if (!cleaner) return null;

  return {
    full_name: cleaner.full_name,
    cleaner_code: cleaner.cleaner_code,
    bio: cleaner.bio,
    photo_path: cleaner.photo_path,
    rating: cleaner.rating,
    completed_jobs: cleaner.completed_jobs ?? 0,
    verified: cleaner.verified,
  };
}

export async function revokeShareCards(bookingId: string): Promise<void> {
  await serviceClient()
    .from("cleaner_share_cards")
    .update({ revoked_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .is("revoked_at", null);
}
