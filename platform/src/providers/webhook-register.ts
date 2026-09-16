/**
 * Idempotent raw provider event register (Blueprint §8.3, webhook_events table).
 * storeOnce records each event exactly once keyed by (provider, payload_hash);
 * a duplicate replay is recognised and reported so downstream work runs once.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";

export async function storeOnce(input: {
  provider: string;
  payloadHash: string;
  eventType?: string;
  reference?: string;
  providerEventId?: string;
  payload: unknown;
}): Promise<{ firstSeen: boolean }> {
  const db = serviceClient();
  const { error } = await db.from("webhook_events").insert({
    provider: input.provider,
    payload_hash: input.payloadHash,
    event_type: input.eventType ?? null,
    reference: input.reference ?? null,
    provider_event_id: input.providerEventId ?? null,
    payload: input.payload as object,
  });

  // Unique violation (23505) => we have seen this exact payload before.
  if (error) {
    if ((error as { code?: string }).code === "23505") return { firstSeen: false };
    throw error;
  }
  return { firstSeen: true };
}
