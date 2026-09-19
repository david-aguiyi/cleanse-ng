/**
 * Canonical plan pricing matrix for Regular Cleaning (Blueprint §2.2 pilot rates).
 *
 * All amounts are in KOBO (₦1 = 100 kobo) and are the amount CHARGED for the
 * whole billing cycle:
 *   - ONE_TIME : a single visit (charged once)
 *   - WEEKLY   : 4 visits / month (whole month charged upfront)
 *   - MONTHLY  : 8 visits / month (whole month charged upfront)
 *
 * Each cell decomposes the customer price into the four parts shown to the
 * customer in the booking summary. They ALWAYS sum to `totalKobo`:
 *   cleaningKobo (cleanser payout) + transportKobo + suppliesKobo + serviceFeeKobo
 *
 * IMPORTANT: the browser booking modal (platform/public/index.js) keeps an
 * identical copy of these figures in NAIRA for instant display. If you change a
 * number here, change it there too — the server total is authoritative (it is
 * what Paystack charges), and the two must match or the customer sees one price
 * and is charged another.
 */

export type PlanFrequency = "ONE_TIME" | "WEEKLY" | "MONTHLY";

export const PLAN_FREQUENCIES: readonly PlanFrequency[] = ["ONE_TIME", "WEEKLY", "MONTHLY"];

export interface PlanBreakdown {
  /** Visits charged in this billing cycle. */
  visits: number;
  /** Total customer price for the cycle, in kobo. */
  totalKobo: number;
  /** Cleanser payout for the cycle, in kobo. */
  cleaningKobo: number;
  transportKobo: number;
  suppliesKobo: number;
  /** Cleanse service fee for the cycle, in kobo. */
  serviceFeeKobo: number;
}

const N = (naira: number) => naira * 100;

// bedrooms (1-5) -> frequency -> breakdown (kobo)
const MATRIX: Record<number, Record<PlanFrequency, PlanBreakdown>> = {
  1: {
    ONE_TIME: { visits: 1, totalKobo: N(9000), cleaningKobo: N(4500), transportKobo: N(2000), suppliesKobo: N(700), serviceFeeKobo: N(1800) },
    WEEKLY: { visits: 4, totalKobo: N(32000), cleaningKobo: N(15000), transportKobo: N(5000), suppliesKobo: N(2800), serviceFeeKobo: N(9200) },
    MONTHLY: { visits: 8, totalKobo: N(49000), cleaningKobo: N(30000), transportKobo: N(8000), suppliesKobo: N(5600), serviceFeeKobo: N(5400) },
  },
  2: {
    ONE_TIME: { visits: 1, totalKobo: N(13000), cleaningKobo: N(7400), transportKobo: N(2000), suppliesKobo: N(1000), serviceFeeKobo: N(2600) },
    WEEKLY: { visits: 4, totalKobo: N(44000), cleaningKobo: N(25000), transportKobo: N(5000), suppliesKobo: N(4000), serviceFeeKobo: N(10000) },
    MONTHLY: { visits: 8, totalKobo: N(74000), cleaningKobo: N(50000), transportKobo: N(8000), suppliesKobo: N(8000), serviceFeeKobo: N(8000) },
  },
  3: {
    ONE_TIME: { visits: 1, totalKobo: N(17000), cleaningKobo: N(10100), transportKobo: N(2000), suppliesKobo: N(1500), serviceFeeKobo: N(3400) },
    WEEKLY: { visits: 4, totalKobo: N(52000), cleaningKobo: N(35000), transportKobo: N(5000), suppliesKobo: N(6000), serviceFeeKobo: N(6000) },
    MONTHLY: { visits: 8, totalKobo: N(90000), cleaningKobo: N(60000), transportKobo: N(8000), suppliesKobo: N(12000), serviceFeeKobo: N(10000) },
  },
  4: {
    ONE_TIME: { visits: 1, totalKobo: N(20000), cleaningKobo: N(12000), transportKobo: N(2000), suppliesKobo: N(2000), serviceFeeKobo: N(4000) },
    WEEKLY: { visits: 4, totalKobo: N(60000), cleaningKobo: N(40000), transportKobo: N(5000), suppliesKobo: N(8000), serviceFeeKobo: N(7000) },
    MONTHLY: { visits: 8, totalKobo: N(110000), cleaningKobo: N(75000), transportKobo: N(8000), suppliesKobo: N(16000), serviceFeeKobo: N(11000) },
  },
  5: {
    ONE_TIME: { visits: 1, totalKobo: N(25000), cleaningKobo: N(16000), transportKobo: N(2000), suppliesKobo: N(2000), serviceFeeKobo: N(5000) },
    WEEKLY: { visits: 4, totalKobo: N(80000), cleaningKobo: N(55000), transportKobo: N(5000), suppliesKobo: N(8000), serviceFeeKobo: N(12000) },
    MONTHLY: { visits: 8, totalKobo: N(120000), cleaningKobo: N(80000), transportKobo: N(8000), suppliesKobo: N(16000), serviceFeeKobo: N(16000) },
  },
};

// Fail fast in dev if any cell's parts stop summing to its total.
for (const [bedrooms, byFreq] of Object.entries(MATRIX)) {
  for (const [freq, b] of Object.entries(byFreq)) {
    const sum = b.cleaningKobo + b.transportKobo + b.suppliesKobo + b.serviceFeeKobo;
    if (sum !== b.totalKobo) {
      throw new Error(
        `plan-pricing: ${bedrooms}BR ${freq} parts (${sum}) != total (${b.totalKobo})`
      );
    }
  }
}

export function isPlanFrequency(code: string): code is PlanFrequency {
  return (PLAN_FREQUENCIES as readonly string[]).includes(code);
}

/**
 * Resolve the charged breakdown for a bedroom count and frequency, or null when
 * the combination is not offered (only 1-5 bedrooms are priced online).
 */
export function resolvePlanBreakdown(
  bedrooms: number,
  frequency: PlanFrequency
): PlanBreakdown | null {
  return MATRIX[bedrooms]?.[frequency] ?? null;
}
