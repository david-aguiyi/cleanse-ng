/**
 * Cleaner device / FCM token lifecycle (Blueprint §9.2).
 * - Upsert token on login, permission change and token refresh.
 * - On an invalid-token response from FCM, mark the device inactive so dispatch
 *   stops targeting it and falls back to SMS.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import type { RegisterDeviceInput } from "@/validation/schemas";

export async function registerDevice(cleanerId: string, input: RegisterDeviceInput) {
  const db = serviceClient();
  const nowIso = new Date().toISOString();

  // Token is globally unique; upsert on the token so the same device re-registers
  // cleanly and can move between cleaners only via explicit reassignment.
  const { data: existing } = await db
    .from("cleaner_devices")
    .select("id")
    .eq("fcm_token", input.fcm_token)
    .maybeSingle();

  if (existing) {
    await db
      .from("cleaner_devices")
      .update({
        cleaner_id: cleanerId,
        platform: input.platform,
        push_permission: input.push_permission,
        device_fingerprint: input.device_fingerprint ?? null,
        is_active: true,
        last_seen_at: nowIso,
        token_updated_at: nowIso,
      })
      .eq("id", existing.id);
    return { id: existing.id, updated: true };
  }

  const { data: created, error } = await db
    .from("cleaner_devices")
    .insert({
      cleaner_id: cleanerId,
      platform: input.platform,
      fcm_token: input.fcm_token,
      push_permission: input.push_permission,
      device_fingerprint: input.device_fingerprint ?? null,
      is_active: true,
      last_seen_at: nowIso,
      token_updated_at: nowIso,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: created!.id, updated: false };
}

export async function markTokenInactive(fcmToken: string): Promise<void> {
  await serviceClient()
    .from("cleaner_devices")
    .update({ is_active: false })
    .eq("fcm_token", fcmToken);
}

export interface DeviceHealth {
  id: string;
  platform: string;
  push_permission: string;
  is_active: boolean;
  last_seen_at: string | null;
}

export async function listDevices(cleanerId: string): Promise<DeviceHealth[]> {
  const { data } = await serviceClient()
    .from("cleaner_devices")
    .select("id, platform, push_permission, is_active, last_seen_at")
    .eq("cleaner_id", cleanerId)
    .order("last_seen_at", { ascending: false });
  return (data ?? []) as DeviceHealth[];
}

/** Active FCM tokens for a cleaner (used by dispatch to target push). */
export async function activeTokens(cleanerId: string): Promise<string[]> {
  const { data } = await serviceClient()
    .from("cleaner_devices")
    .select("fcm_token")
    .eq("cleaner_id", cleanerId)
    .eq("is_active", true)
    .eq("push_permission", "GRANTED");
  return (data ?? [])
    .map((d: Record<string, any>) => d.fcm_token as string)
    .filter((t: string | null): t is string => Boolean(t));
}
