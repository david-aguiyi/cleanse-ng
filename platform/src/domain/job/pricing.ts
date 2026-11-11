/**
 * Pure operational pricing, supplies deductions, cleaner splits, and
 * subscription/visit lifecycle rules for Cleanse Jobs & Payouts.
 */

export const CLEANER_SHARE_BPS = 7000; // 70% cleaner cut after supplies

export const JOB_STATUSES = ["PENDING", "ACTIVE", "PAUSED", "ENDED", "TERMINATED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const VISIT_STATUSES = ["SCHEDULED", "SERVED", "PAUSED", "CANCELLED"] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export interface CleanerSplit {
  shareBps: number;
  amountNaira: number;
}

export interface JobEconomics {
  sessionsCount: number;
  invoiceTotalNaira: number;
  pricePerCleanNaira: number;
  suppliesPerVisitNaira: number;
  netBasePerCleanNaira: number;
  cleanerPoolPerCleanNaira: number;
  planCleanerCutNaira: number;
  cleanerSplits: CleanerSplit[];
}

/**
 * Cleaning supplies cost deducted internally per visit before calculating
 * the 70% cleaner payout pool (never shown on customer invoice PDF):
 * - ₦800 per visit for 1–2 bedrooms (on every job)
 * - ₦1,500 per visit for 3–5+ bedrooms (on every job)
 */
export function suppliesDeductionPerVisit(
  bedrooms: number,
  _materialsBy?: string | null
): number {
  const br = Number.isFinite(bedrooms) && bedrooms > 0 ? Math.floor(bedrooms) : 1;
  return br <= 2 ? 800 : 1500;
}

/**
 * Splits a single visit's 70% cleaner payout pool across 1 or 2 serving cleaners.
 * 1 cleaner -> 100% of the 70% pool.
 * 2 cleaners -> 50% / 50% (35% each of net base), summing strictly to poolNaira.
 */
export function splitCleanerPool(poolNaira: number, cleanerCount: number): CleanerSplit[] {
  const pool = Math.max(0, Math.round(poolNaira || 0));
  const count = Math.min(2, Math.max(0, Math.floor(cleanerCount || 0)));
  if (count === 0) return [];
  if (count === 1) return [{ shareBps: 10000, amountNaira: pool }];
  const first = Math.round(pool / 2);
  const second = pool - first;
  return [
    { shareBps: 5000, amountNaira: first },
    { shareBps: 5000, amountNaira: second },
  ];
}

export function computeInvoiceJobEconomics(input: {
  totalNaira: number;
  sessionsCount: number;
  bedrooms: number;
  materialsBy?: string | null;
  cleanerCount?: number;
}): JobEconomics {
  const sessionsCount =
    Number.isFinite(input.sessionsCount) && input.sessionsCount > 0
      ? Math.floor(input.sessionsCount)
      : 1;
  const invoiceTotalNaira = Math.max(0, Math.round(input.totalNaira || 0));
  const pricePerCleanNaira = Math.round(invoiceTotalNaira / sessionsCount);
  const suppliesPerVisitNaira = suppliesDeductionPerVisit(input.bedrooms, input.materialsBy);
  const netBasePerCleanNaira = Math.max(0, pricePerCleanNaira - suppliesPerVisitNaira);
  const cleanerPoolPerCleanNaira = Math.round((netBasePerCleanNaira * CLEANER_SHARE_BPS) / 10000);
  const planCleanerCutNaira = cleanerPoolPerCleanNaira * sessionsCount;
  const cleanerSplits = splitCleanerPool(cleanerPoolPerCleanNaira, input.cleanerCount ?? 1);

  return {
    sessionsCount,
    invoiceTotalNaira,
    pricePerCleanNaira,
    suppliesPerVisitNaira,
    netBasePerCleanNaira,
    cleanerPoolPerCleanNaira,
    planCleanerCutNaira,
    cleanerSplits,
  };
}

/**
 * Only ACTIVE jobs with reserveCalendar !== false reserve public booking slots
 * and show upcoming scheduled days on cleaner /pro dashboards.
 */
export function isJobActiveForCalendar(status: string | null | undefined, reserveCalendar?: boolean): boolean {
  return status === "ACTIVE" && reserveCalendar !== false;
}

/**
 * Determines target visit status for unserved visits when a job transitions to `nextStatus`.
 * SERVED visits are strictly preserved across ALL status transitions.
 */
export function targetStatusForUnservedVisit(
  nextJobStatus: JobStatus,
  currentVisitStatus: VisitStatus,
  visitDate: string,
  todayIso: string
): VisitStatus {
  if (currentVisitStatus === "SERVED") return "SERVED";

  switch (nextJobStatus) {
    case "ACTIVE":
      // Resuming/activating makes upcoming or previously paused visits active again.
      if (currentVisitStatus === "PAUSED" || (visitDate >= todayIso && currentVisitStatus === "CANCELLED")) {
        return "SCHEDULED";
      }
      return currentVisitStatus;
    case "PENDING":
      return currentVisitStatus === "PAUSED" ? "SCHEDULED" : currentVisitStatus;
    case "PAUSED":
      return currentVisitStatus === "SCHEDULED" && visitDate >= todayIso ? "PAUSED" : currentVisitStatus;
    case "ENDED":
    case "TERMINATED":
      return visitDate >= todayIso || currentVisitStatus === "SCHEDULED" || currentVisitStatus === "PAUSED"
        ? "CANCELLED"
        : currentVisitStatus;
  }
}

/**
 * Pure helper to determine unpaid payout totals and which earning IDs settle
 * up through an inclusive `cutoffDate` (YYYY-MM-DD), ensuring rows already
 * linked to a `payoutId` can never be settled twice.
 */
export function selectEarningsForSettlement<
  T extends { id: string; earned_on: string; amount_naira: number; payout_id: string | null }
>(earnings: T[], cutoffDate: string): { ids: string[]; totalNaira: number; count: number } {
  const eligible = earnings.filter((e) => !e.payout_id && e.earned_on <= cutoffDate);
  const totalNaira = eligible.reduce((sum, e) => sum + Math.max(0, Math.round(e.amount_naira)), 0);
  return {
    ids: eligible.map((e) => e.id),
    totalNaira,
    count: eligible.length,
  };
}

export interface AddressUnlockState {
  unlocked: boolean;
  unlockTimeLabel: string;
}

const SLOT_UNLOCK_WINDOW: Record<string, { unlockHour: number; label: string }> = {
  "8am - 11am": { unlockHour: 7, label: "7:00 AM" },
  "11am - 2pm": { unlockHour: 10, label: "10:00 AM" },
  "2pm - 5pm": { unlockHour: 13, label: "1:00 PM" },
};

/**
 * Hides exact client house details from Cleanse Pros until 1 hour before
 * the scheduled visit window on job morning (Africa/Lagos, UTC+1), and hides
 * them again after the visit day passes.
 */
export function isAddressUnlockedForSlot(
  visitDate: string,
  slot: string,
  now: Date = new Date()
): AddressUnlockState {
  const cfg = SLOT_UNLOCK_WINDOW[slot] ?? { unlockHour: 7, label: "7:00 AM" };
  const unlockHourStr = String(cfg.unlockHour).padStart(2, "0");
  const unlockMs = Date.parse(`${visitDate}T${unlockHourStr}:00:00+01:00`);
  const endOfDayMs = Date.parse(`${visitDate}T23:59:59+01:00`);
  const nowMs = now.getTime();
  const unlocked = Number.isFinite(unlockMs) && nowMs >= unlockMs && nowMs <= endOfDayMs;
  return {
    unlocked,
    unlockTimeLabel: `${cfg.label} on job day`,
  };
}

/**
 * Timestamp variant for online bookings: unlocks 1 hour before scheduled_start_at
 * and hides again 12 hours after scheduled_start_at (or when already completed).
 */
export function isAddressUnlockedForTimestamp(
  scheduledStartAtIso: string,
  now: Date = new Date()
): AddressUnlockState {
  const startMs = Date.parse(scheduledStartAtIso);
  if (!Number.isFinite(startMs)) {
    return { unlocked: false, unlockTimeLabel: "1 hour before job start" };
  }
  const unlockMs = startMs - 60 * 60 * 1000;
  const expireMs = startMs + 12 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  const label = new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(unlockMs));

  return {
    unlocked: nowMs >= unlockMs && nowMs <= expireMs,
    unlockTimeLabel: label,
  };
}

