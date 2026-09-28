/**
 * PricingService — computes immutable server-authoritative quotes and price
 * snapshots from database configuration (Blueprint §2.2, §3.1 step 3).
 * The browser never supplies the authoritative total.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { appConfig, payoutConfig } from "@/config";
import { AppError } from "@/http/errors";
import { formatNairaFromKobo } from "@/lib/money";
import type { PriceLineItem, QuoteResult } from "@/domain/types";
import type { QuoteRequest } from "@/validation/schemas";
import { isPlanFrequency, resolvePlanPrice } from "./plan-pricing";

const FREQUENCY_LABEL: Record<string, string> = {
  ONE_TIME: "Per visit",
  WEEKLY: "Once a week (4 visits / month)",
  MONTHLY: "Twice a week (8 visits / month)",
};

export async function createQuote(input: QuoteRequest): Promise<QuoteResult> {
  const db = serviceClient();

  const { data: service, error: serviceErr } = await db
    .from("services")
    .select("id, code, name, pricing_mode, active")
    .eq("code", input.service_code)
    .maybeSingle();

  if (serviceErr) throw new AppError("INTERNAL_ERROR", "Could not load service.");
  if (!service || !service.active) throw new AppError("SERVICE_NOT_FOUND", "Service not available.");
  if (service.pricing_mode !== "FIXED_RULES") {
    throw new AppError(
      "SERVICE_NOT_BOOKABLE_ONLINE",
      "This service is quoted manually. Please contact us for a tailored quote."
    );
  }

  const { data: zone, error: zoneErr } = await db
    .from("service_zones")
    .select("id, code, active")
    .eq("code", input.zone_code)
    .maybeSingle();

  if (zoneErr) throw new AppError("INTERNAL_ERROR", "Could not load zone.");
  if (!zone || !zone.active) {
    throw new AppError("ZONE_NOT_SERVICEABLE", "We do not currently serve this area.");
  }

  // Frequency-driven plan pricing. The plan matrix (plan-pricing.ts) is the
  // single source of truth for what Paystack charges. Customers see the total
  // only, so the plan is a single line item.
  const nowIso = new Date().toISOString();
  const frequency = input.frequency_code;
  if (!isPlanFrequency(frequency)) {
    throw new AppError("PRICING_UNAVAILABLE", "This plan frequency is not available online.");
  }
  const plan = resolvePlanPrice(input.property_bedrooms, frequency);
  if (!plan) {
    throw new AppError("PRICING_UNAVAILABLE", "No active price for this configuration.");
  }

  const cleanerCount = input.requested_cleaner_count;
  const scale = (kobo: number) => kobo * cleanerCount;
  const planLabel = FREQUENCY_LABEL[frequency] ?? frequency;

  // Cleanse's share after the configured cleaner payout, stored for reporting.
  const serviceFeeBps = 10000 - payoutConfig.cleanerPayoutBps;

  // Code is PLAN, not CLEANING: dispatch reads a CLEANING line as the cleaner's
  // payout, so a whole-price CLEANING line would offer cleaners the full total.
  // Without one, dispatch falls back to the configured payout share.
  // NOTE: item_type stays within the DB CHECK set (BASE_SERVICE/EXTRA/
  // DISCOUNT/ADJUSTMENT).
  const lineItems: PriceLineItem[] = [
    {
      item_type: "BASE_SERVICE",
      code: "PLAN",
      description: `${service.name} · ${input.property_bedrooms}BR (${planLabel})`,
      quantity: cleanerCount,
      unit_amount_kobo: plan.totalKobo,
      line_total_kobo: scale(plan.totalKobo),
    },
  ];

  // Extras (each priced by its own rule where present; unknown extras ignored).
  let extrasKobo = 0;
  if (input.extras.length > 0) {
    const { data: extraRows } = await db
      .from("service_extras")
      .select("id, code, name")
      .eq("service_id", service.id)
      .in("code", input.extras);

    for (const extra of extraRows ?? []) {
      const { data: extraRules } = await db
        .from("pricing_rules")
        .select("amount_kobo, effective_from, effective_to")
        .eq("service_id", service.id)
        .eq("extra_id", extra.id)
        .eq("active", true)
        .lte("effective_from", nowIso)
        .order("effective_from", { ascending: false });

      const extraRule = (extraRules ?? []).find(
        (r) => r.effective_to === null || new Date(r.effective_to).getTime() > Date.now()
      );
      const amount = extraRule ? Number(extraRule.amount_kobo) : 0;
      extrasKobo += amount;
      lineItems.push({
        item_type: "EXTRA",
        code: extra.code,
        description: extra.name,
        quantity: 1,
        unit_amount_kobo: amount,
        line_total_kobo: amount,
      });
    }
  }

  const subtotalKobo = scale(plan.totalKobo);
  const totalKobo = subtotalKobo + extrasKobo;

  const calculationSnapshot = {
    service_code: service.code,
    zone_code: zone.code,
    property_bedrooms: input.property_bedrooms,
    requested_cleaner_count: input.requested_cleaner_count,
    frequency_code: frequency,
    plan_visits: plan.visits,
    service_fee_bps: serviceFeeBps,
    line_items: lineItems,
    computed_at: nowIso,
  };

  const expiresAt = new Date(Date.now() + appConfig.quoteTtlSeconds * 1000).toISOString();

  const { data: quote, error: insErr } = await db
    .from("quotes")
    .insert({
      service_id: service.id,
      zone_id: zone.id,
      property_bedrooms: input.property_bedrooms,
      requested_cleaner_count: input.requested_cleaner_count,
      frequency_code: input.frequency_code,
      subtotal_kobo: subtotalKobo,
      extras_kobo: extrasKobo,
      total_kobo: totalKobo,
      currency: appConfig.currency,
      service_fee_bps: serviceFeeBps,
      calculation_snapshot: calculationSnapshot,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();

  if (insErr || !quote) throw new AppError("INTERNAL_ERROR", "Could not create quote.");

  return {
    quoteId: quote.id,
    currency: appConfig.currency,
    subtotalKobo,
    extrasKobo,
    totalKobo,
    serviceFeeBps,
    displayTotal: formatNairaFromKobo(totalKobo),
    expiresAt: quote.expires_at,
    lineItems,
  };
}
