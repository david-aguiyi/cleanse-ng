/**
 * Canonical plan pricing matrix for Regular Cleaning.
 *
 * All amounts are in KOBO (₦1 = 100 kobo) and are the amount CHARGED for the
 * whole billing cycle:
 *   - ONE_TIME : a single visit (charged once)
 *   - WEEKLY   : once a week, 4 visits / month (whole month charged upfront)
 *   - MONTHLY  : twice a week, 8 visits / month (whole month charged upfront)
 *
 * Customers see the total only — there is no itemised split. Cleaner pay is
 * internal unit economics (see payoutConfig), not derived from this matrix.
 *
 * IMPORTANT: the browser booking modal (platform/public/index.js) keeps an
 * identical copy of these figures in NAIRA for instant display. If you change a
 * number here, change it there too — the server total is authoritative (it is
 * what Paystack charges), and the two must match or the customer sees one price
 * and is charged another.
 */

export type PlanFrequency = "ONE_TIME" | "WEEKLY" | "MONTHLY";

export const PLAN_FREQUENCIES: readonly PlanFrequency[] = ["ONE_TIME", "WEEKLY", "MONTHLY"];

export interface PlanPrice {
  /** Visits charged in this billing cycle. */
  visits: number;
  /** Total customer price for the cycle, in kobo. */
  totalKobo: number;
}

const N = (naira: number) => naira * 100;

// bedrooms (1-5) -> frequency -> price (kobo)
const MATRIX: Record<number, Record<PlanFrequency, PlanPrice>> = {
  1: {
    ONE_TIME: { visits: 1, totalKobo: N(5000) },
    WEEKLY: { visits: 4, totalKobo: N(12000) },
    MONTHLY: { visits: 8, totalKobo: N(20000) },
  },
  2: {
    ONE_TIME: { visits: 1, totalKobo: N(8000) },
    WEEKLY: { visits: 4, totalKobo: N(20000) },
    MONTHLY: { visits: 8, totalKobo: N(40000) },
  },
  3: {
    ONE_TIME: { visits: 1, totalKobo: N(12000) },
    WEEKLY: { visits: 4, totalKobo: N(30000) },
    MONTHLY: { visits: 8, totalKobo: N(50000) },
  },
  4: {
    ONE_TIME: { visits: 1, totalKobo: N(15000) },
    WEEKLY: { visits: 4, totalKobo: N(40000) },
    MONTHLY: { visits: 8, totalKobo: N(40000) },
  },
  5: {
    ONE_TIME: { visits: 1, totalKobo: N(20000) },
    WEEKLY: { visits: 4, totalKobo: N(50000) },
    MONTHLY: { visits: 8, totalKobo: N(50000) },
  },
};

export function isPlanFrequency(code: string): code is PlanFrequency {
  return (PLAN_FREQUENCIES as readonly string[]).includes(code);
}

/**
 * Resolve the charged price for a bedroom count and frequency, or null when
 * the combination is not offered (only 1-5 bedrooms are priced online).
 */
export function resolvePlanPrice(bedrooms: number, frequency: PlanFrequency): PlanPrice | null {
  return MATRIX[bedrooms]?.[frequency] ?? null;
}
