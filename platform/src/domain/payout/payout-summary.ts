/**
 * Pure aggregation helpers for cumulative and month-by-month Cleanse Pro payouts.
 * Kept free of "server-only" so both server services and Vitest unit tests share one truth.
 */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/;

export interface SettlementInputRow {
  cleaner_id: string;
  cleaner_name?: string;
  cleaner_code?: string;
  period_key: string;
  cutoff_date: string;
  settled_at: string;
  total_amount_naira: number;
  earning_count: number;
}

export interface MonthlyPaidWorkerBreakdown {
  cleaner_id: string;
  cleaner_name: string;
  cleaner_code: string;
  amount_naira: number;
  cleans_count: number;
}

export interface MonthlyPaidSummaryRow {
  month_key: string; // e.g. "2026-11"
  month_label: string; // e.g. "Nov 2026"
  total_paid_naira: number;
  cumulative_paid_through_month_naira: number;
  workers_paid_count: number;
  settlement_count: number;
  cleans_count: number;
  workers: MonthlyPaidWorkerBreakdown[];
}

export interface PaidOverviewSummary {
  current_month_key: string;
  current_month_label: string;
  this_month_paid_naira: number;
  this_month_workers_paid_count: number;
  cumulative_paid_naira: number;
  cumulative_workers_paid_count: number;
  cumulative_settlement_count: number;
  cumulative_cleans_count: number;
  months: MonthlyPaidSummaryRow[];
}

export function formatMonthLabel(monthKey: string): string {
  const m = YEAR_MONTH_RE.exec(String(monthKey ?? "").trim());
  if (!m || !m[1] || !m[2]) return monthKey || "Unknown";
  const idx = Number(m[2]) - 1;
  const name = MONTH_NAMES[idx] ?? m[2];
  return `${name} ${m[1]}`;
}

function lagosMonthFromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(dt);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return year && month ? `${year}-${month}` : "";
}

/**
 * Resolves the canonical billing month (`YYYY-MM`) a payout belongs to:
 * explicit monthly period keys (`YYYY-MM`) win; "all" / cut-off settlements fall
 * back to settlement timestamp in Africa/Lagos time, then cutoff_date.
 */
export function resolveSettlementMonthKey(row: {
  period_key: string;
  settled_at: string;
  cutoff_date: string;
}): string {
  const pk = String(row.period_key ?? "").trim();
  if (YEAR_MONTH_RE.test(pk)) return pk;

  const settledMonth = lagosMonthFromIso(row.settled_at);
  if (YEAR_MONTH_RE.test(settledMonth)) return settledMonth;

  const cutoffMonth = String(row.cutoff_date ?? "").trim().slice(0, 7);
  if (YEAR_MONTH_RE.test(cutoffMonth)) return cutoffMonth;

  return "unknown";
}

export function summarizeMonthlyPayouts(
  rows: SettlementInputRow[],
  currentMonthKey: string
): PaidOverviewSummary {
  const byMonth = new Map<
    string,
    {
      total_paid_naira: number;
      settlement_count: number;
      cleans_count: number;
      workers: Map<string, MonthlyPaidWorkerBreakdown>;
    }
  >();

  const allTimeWorkers = new Set<string>();
  let cumulativePaid = 0;
  let cumulativeCleans = 0;

  for (const r of rows) {
    const amount = Number(r.total_amount_naira || 0);
    const cleans = Number(r.earning_count || 0);
    const monthKey = resolveSettlementMonthKey(r);

    cumulativePaid += amount;
    cumulativeCleans += cleans;
    if (r.cleaner_id) allTimeWorkers.add(r.cleaner_id);

    const bucket = byMonth.get(monthKey) ?? {
      total_paid_naira: 0,
      settlement_count: 0,
      cleans_count: 0,
      workers: new Map<string, MonthlyPaidWorkerBreakdown>(),
    };
    bucket.total_paid_naira += amount;
    bucket.settlement_count += 1;
    bucket.cleans_count += cleans;

    if (r.cleaner_id) {
      const prevWorker = bucket.workers.get(r.cleaner_id) ?? {
        cleaner_id: r.cleaner_id,
        cleaner_name: r.cleaner_name || "Cleanse Pro",
        cleaner_code: r.cleaner_code || "",
        amount_naira: 0,
        cleans_count: 0,
      };
      prevWorker.amount_naira += amount;
      prevWorker.cleans_count += cleans;
      bucket.workers.set(r.cleaner_id, prevWorker);
    }

    byMonth.set(monthKey, bucket);
  }

  // Compute chronological running cumulative total first (oldest -> newest), then reverse to newest-first.
  const ascKeys = Array.from(byMonth.keys()).sort((a, b) => a.localeCompare(b));
  let runningTotal = 0;
  const chronological: MonthlyPaidSummaryRow[] = ascKeys.map((monthKey) => {
    const bucket = byMonth.get(monthKey)!;
    runningTotal += bucket.total_paid_naira;
    const workers = Array.from(bucket.workers.values()).sort(
      (a, b) => b.amount_naira - a.amount_naira || a.cleaner_name.localeCompare(b.cleaner_name)
    );
    return {
      month_key: monthKey,
      month_label: formatMonthLabel(monthKey),
      total_paid_naira: bucket.total_paid_naira,
      cumulative_paid_through_month_naira: runningTotal,
      workers_paid_count: workers.length,
      settlement_count: bucket.settlement_count,
      cleans_count: bucket.cleans_count,
      workers,
    };
  });

  const monthsDesc = chronological.slice().reverse();
  const thisMonth = monthsDesc.find((m) => m.month_key === currentMonthKey);

  return {
    current_month_key: currentMonthKey,
    current_month_label: formatMonthLabel(currentMonthKey),
    this_month_paid_naira: thisMonth?.total_paid_naira ?? 0,
    this_month_workers_paid_count: thisMonth?.workers_paid_count ?? 0,
    cumulative_paid_naira: cumulativePaid,
    cumulative_workers_paid_count: allTimeWorkers.size,
    cumulative_settlement_count: rows.length,
    cumulative_cleans_count: cumulativeCleans,
    months: monthsDesc,
  };
}

