/**
 * Concurrency acceptance test (Blueprint §16: "10 simultaneous accepts").
 *
 * Verifies the atomic first-accept-wins invariant end-to-end against a real
 * Postgres via the claim_job_offer RPC: exactly one WON, the rest ALREADY_TAKEN,
 * and exactly one active assignment.
 *
 * Runs only when a TEST Supabase is configured (never against production). Set:
 *   CLEANSE_TEST_SUPABASE_URL, CLEANSE_TEST_SERVICE_ROLE_KEY
 * The schema (0001–0003) and seed (REGULAR service, BODIJA zone) must be applied.
 */
import { describe, it, expect } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.CLEANSE_TEST_SUPABASE_URL;
const KEY = process.env.CLEANSE_TEST_SERVICE_ROLE_KEY;
const RUN = Boolean(URL && KEY);
const N = 10;

function db(): SupabaseClient {
  return createClient(URL!, KEY!, { auth: { persistSession: false } });
}

describe.skipIf(!RUN)("claim_job_offer concurrency", () => {
  it("yields exactly one winner for 10 concurrent accepts", async () => {
    const s = db();
    const suffix = Date.now().toString().slice(-9);

    const { data: service } = await s.from("services").select("id").eq("code", "REGULAR").single();
    const { data: zone } = await s.from("service_zones").select("id").eq("code", "BODIJA").single();
    expect(service?.id && zone?.id).toBeTruthy();

    const { data: customer } = await s
      .from("customers")
      .insert({
        full_name: "Concurrency Test",
        email: `ctest_${suffix}@example.com`,
        phone_e164: `+234900${suffix}`,
        whatsapp_e164: `+234900${suffix}`,
      })
      .select("id")
      .single();

    const { data: address } = await s
      .from("customer_addresses")
      .insert({ customer_id: customer!.id, zone_id: zone!.id, address_line1: "1 Test St" })
      .select("id")
      .single();

    const { data: booking } = await s
      .from("bookings")
      .insert({
        public_reference: `CLN-TEST-${suffix}`,
        customer_id: customer!.id,
        address_id: address!.id,
        service_id: service!.id,
        zone_id: zone!.id,
        scheduled_start_at: new Date(Date.now() + 86400000).toISOString(),
        requested_cleaner_count: 1,
        customer_status: "CONFIRMED",
        fulfilment_status: "DISPATCHING",
        payment_status: "SUCCESS",
        subtotal_kobo: 1700000,
        total_kobo: 1700000,
        price_snapshot: {},
      })
      .select("id")
      .single();

    // N eligible cleaners + one active offer each (slot 1).
    const cleanerIds: string[] = [];
    const offerIds: string[] = [];
    const expires = new Date(Date.now() + 300000).toISOString();
    for (let i = 0; i < N; i++) {
      const { data: cleaner } = await s
        .from("cleaners")
        .insert({
          cleaner_code: `CT-${suffix}-${i}`,
          full_name: `Cleaner ${i}`,
          phone_e164: `+234901${suffix}${i}`,
          account_status: "ACTIVE",
          availability: "AVAILABLE",
          verified: true,
          deployment_ready: true,
        })
        .select("id")
        .single();
      cleanerIds.push(cleaner!.id);
      const { data: offer } = await s
        .from("job_offers")
        .insert({
          booking_id: booking!.id,
          cleaner_id: cleaner!.id,
          dispatch_round: 1,
          slot_number: 1,
          status: "PUSH_SENT",
          expires_at: expires,
        })
        .select("id")
        .single();
      offerIds.push(offer!.id);
    }

    // Fire all accepts concurrently.
    const results = await Promise.all(
      offerIds.map((offerId, i) =>
        s.rpc("claim_job_offer", { p_offer_id: offerId, p_cleaner_id: cleanerIds[i] })
      )
    );

    const wins = results.filter((r) => {
      const row = Array.isArray(r.data) ? r.data[0] : r.data;
      return row?.won === true;
    });
    expect(wins).toHaveLength(1);

    const { data: assignments } = await s
      .from("job_assignments")
      .select("id")
      .eq("booking_id", booking!.id)
      .in("status", ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"]);
    expect(assignments).toHaveLength(1);

    // Cleanup (cascades remove offers/assignments/events).
    await s.from("bookings").delete().eq("id", booking!.id);
    await s.from("cleaners").delete().in("id", cleanerIds);
    await s.from("customers").delete().eq("id", customer!.id);
  }, 30000);
});
