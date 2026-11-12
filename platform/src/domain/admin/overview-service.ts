/**
 * AdminOverviewService — lightweight read-only telemetry for the /admin Command
 * Overview dashboard and live left-sidebar badge counts. Focused on the core
 * Cleanse workflow: Invoices -> Jobs & Visits -> Cleanse Pros -> Payouts.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { lagosTodayIso } from "@/domain/invoice/schedule";
import { isMissingJobSchemaError } from "@/domain/job/invoice-job-service";
import { summarizeMonthlyPayouts } from "@/domain/payout/payout-summary";

export interface AdminNavCounts {
  jobsActionNeeded: number;
  onboardingsPending: number;
  applicantsNew: number;
  payoutsDuePros: number;
}

export interface AttentionItem {
  id: string;
  kind:
    | "UNASSIGNED_JOB"
    | "PENDING_JOB"
    | "CONTRACT_ENDED"
    | "ONBOARDING_REVIEW"
    | "NEW_APPLICANT"
    | "PAYOUT_MISSING_BANK";
  tone: "red" | "amber" | "purple";
  title: string;
  detail: string;
  href: string;
  cta: string;
}

export interface TodayVisitItem {
  visitId: string;
  jobId: string;
  invoiceNumber: string;
  slot: string;
  visitStatus: string;
  clientName: string;
  clientArea: string;
  serviceName: string;
  cleaners: Array<{ id: string; cleaner_code: string; full_name: string }>;
  poolNaira: number;
}

export interface OverviewRecentJob {
  id: string;
  invoice_number: string;
  client_name: string;
  client_area: string;
  service_name: string;
  status: string;
  cleaner_count: number;
  contract_end: string | null;
}

export interface AdminOverviewData {
  todayIso: string;
  counts: AdminNavCounts;
  kpis: {
    todayTotal: number;
    todayServed: number;
    todayUpcoming: number;
    activeJobsCount: number;
    jobsActionNeeded: number;
    activeProsCount: number;
    hiringQueueCount: number;
    unpaidPoolNaira: number;
    unpaidProsCount: number;
    currentMonthLabel: string;
    paidThisMonthNaira: number;
    paidThisMonthWorkersCount: number;
    paidTotalAllTimeNaira: number;
    paidWorkersAllTimeCount: number;
  };
  attention: AttentionItem[];
  todayVisits: TodayVisitItem[];
  recentJobs: OverviewRecentJob[];
}

function countJobsNeedingAction(
  jobs: Array<{
    id: string;
    status: string;
    contract_end: string | null;
    invoice_job_cleaners?: Array<{ cleaner_id: string }> | null;
  }>,
  todayIso: string
): Set<string> {
  const flagged = new Set<string>();
  for (const j of jobs) {
    const cleaners = Array.isArray(j.invoice_job_cleaners) ? j.invoice_job_cleaners : [];
    const needsPro = j.status === "ACTIVE" && cleaners.length === 0;
    const isPending = j.status === "PENDING";
    const suggestedEnd =
      j.status === "ACTIVE" && Boolean(j.contract_end) && String(j.contract_end) < todayIso;
    if (needsPro || isPending || suggestedEnd) flagged.add(j.id);
  }
  return flagged;
}

/** Fast cache-free sidebar notification counters shown across every /admin page. */
export async function getAdminNavCounts(): Promise<AdminNavCounts> {
  const db = serviceClient();
  const todayIso = lagosTodayIso();

  const [jobsRes, onboardingsRes, applicantsRes, earningsRes] = await Promise.all([
    db
      .from("invoice_jobs")
      .select("id, status, contract_end, invoice_job_cleaners(cleaner_id)")
      .in("status", ["ACTIVE", "PENDING"]),
    db
      .from("cleaner_onboardings")
      .select("id", { count: "exact", head: true })
      .in("status", ["SUBMITTED", "UNDER_REVIEW"]),
    db
      .from("cleaner_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "NEW"),
    db.from("cleaner_visit_earnings").select("cleaner_id").is("payout_id", null),
  ]);

  const flaggedJobs =
    jobsRes.error && isMissingJobSchemaError(jobsRes.error)
      ? 0
      : countJobsNeedingAction((jobsRes.data ?? []) as Array<any>, todayIso).size;

  const unpaidProIds = new Set<string>();
  if (!earningsRes.error && Array.isArray(earningsRes.data)) {
    for (const row of earningsRes.data as Array<{ cleaner_id?: string }>) {
      if (row.cleaner_id) unpaidProIds.add(row.cleaner_id);
    }
  }

  return {
    jobsActionNeeded: flaggedJobs,
    onboardingsPending: onboardingsRes.error ? 0 : onboardingsRes.count ?? 0,
    applicantsNew: applicantsRes.error ? 0 : applicantsRes.count ?? 0,
    payoutsDuePros: unpaidProIds.size,
  };
}

/** Full telemetry payload for the /admin Command Overview landing page. */
export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const db = serviceClient();
  const todayIso = lagosTodayIso();

  const [
    jobsRes,
    visitsRes,
    activeProsRes,
    onboardingsRes,
    applicantsRes,
    earningsRes,
    banksRes,
    payoutsRes,
  ] = await Promise.all([
    db
      .from("invoice_jobs")
      .select(
        "id, invoice_number, status, client_name, client_area, service_name, contract_start, contract_end, cleaner_pool_per_clean_naira, updated_at, invoice_job_cleaners(slot_order, cleaner:cleaners(id, cleaner_code, full_name))"
      )
      .order("updated_at", { ascending: false })
      .limit(80),
    db
      .from("invoice_job_visits")
      .select("id, job_id, visit_date, slot, status")
      .eq("visit_date", todayIso)
      .neq("status", "CANCELLED"),
    db
      .from("cleaners")
      .select("id", { count: "exact", head: true })
      .eq("account_status", "ACTIVE"),
    db
      .from("cleaner_onboardings")
      .select("id, full_name, preferred_zone, nin_verified, guarantor_called, status")
      .in("status", ["SUBMITTED", "UNDER_REVIEW"])
      .order("created_at", { ascending: true })
      .limit(12),
    db
      .from("cleaner_applications")
      .select("id, full_name, residential_area, status")
      .eq("status", "NEW")
      .order("created_at", { ascending: true })
      .limit(12),
    db
      .from("cleaner_visit_earnings")
      .select("cleaner_id, amount_naira, cleaner:cleaners(id, cleaner_code, full_name)")
      .is("payout_id", null),
    db.from("cleaner_bank_accounts").select("cleaner_id"),
    db
      .from("cleaner_payouts")
      .select("cleaner_id, period_key, cutoff_date, total_amount_naira, earning_count, settled_at"),
  ]);

  const jobs =
    jobsRes.error && isMissingJobSchemaError(jobsRes.error) ? [] : ((jobsRes.data ?? []) as Array<any>);

  const jobMap = new Map<string, any>();
  const jobCleanersMap = new Map<string, Array<{ id: string; cleaner_code: string; full_name: string }>>();

  let activeJobsCount = 0;
  for (const j of jobs) {
    if (j.status === "ACTIVE") activeJobsCount += 1;
    jobMap.set(j.id, j);
    const assigned = ((j.invoice_job_cleaners ?? []) as Array<any>)
      .slice()
      .sort((a, b) => Number(a.slot_order ?? 9) - Number(b.slot_order ?? 9))
      .map((entry) => entry.cleaner)
      .filter(Boolean);
    jobCleanersMap.set(j.id, assigned);
  }

  const flaggedJobIds = countJobsNeedingAction(jobs, todayIso);

  // Build priority attention feed (most urgent operational blockers first)
  const attention: AttentionItem[] = [];

  for (const j of jobs) {
    if (j.status !== "ACTIVE") continue;
    const cleaners = jobCleanersMap.get(j.id) ?? [];
    if (cleaners.length === 0) {
      attention.push({
        id: `unassigned-${j.id}`,
        kind: "UNASSIGNED_JOB",
        tone: "red",
        title: `No Pro assigned · ${j.client_name || j.invoice_number}`,
        detail: `${j.invoice_number} · ${j.client_area || "Ibadan"} · ${j.service_name}`,
        href: `/admin/jobs/${j.id}`,
        cta: "Assign Pro →",
      });
    }
  }

  for (const j of jobs) {
    if (j.status === "PENDING") {
      attention.push({
        id: `pending-${j.id}`,
        kind: "PENDING_JOB",
        tone: "amber",
        title: `Awaiting payment · ${j.client_name || j.invoice_number}`,
        detail: `${j.invoice_number} is a quote/pending plan — activate once payment clears.`,
        href: `/admin/jobs/${j.id}`,
        cta: "Review & Activate →",
      });
    }
  }

  for (const j of jobs) {
    if (j.status === "ACTIVE" && j.contract_end && String(j.contract_end) < todayIso) {
      attention.push({
        id: `ended-${j.id}`,
        kind: "CONTRACT_ENDED",
        tone: "amber",
        title: `Contract period finished · ${j.client_name || j.invoice_number}`,
        detail: `End date was ${j.contract_end}. Mark Ended or renew invoice.`,
        href: `/admin/jobs/${j.id}`,
        cta: "Update Status →",
      });
    }
  }

  const onboardings = (onboardingsRes.data ?? []) as Array<any>;
  for (const ob of onboardings) {
    attention.push({
      id: `ob-${ob.id}`,
      kind: "ONBOARDING_REVIEW",
      tone: "purple",
      title: `Onboarding review · ${ob.full_name}`,
      detail: `${ob.preferred_zone || "Zone unset"} · ${ob.nin_verified ? "NIN verified" : "Verify NIN"} · ${
        ob.guarantor_called ? "Guarantor called" : "Call guarantor"
      }`,
      href: `/admin/onboardings/${ob.id}`,
      cta: "Verify & Approve →",
    });
  }

  const applicants = (applicantsRes.data ?? []) as Array<any>;
  for (const app of applicants) {
    attention.push({
      id: `app-${app.id}`,
      kind: "NEW_APPLICANT",
      tone: "amber",
      title: `New Pro applicant · ${app.full_name}`,
      detail: app.residential_area ? `Lives in ${app.residential_area}` : "Awaiting shortlisting",
      href: `/admin/applicants/${app.id}`,
      cta: "Review →",
    });
  }

  // Unpaid earnings & missing bank details check
  const unpaidByPro = new Map<string, { name: string; code: string; total: number }>();
  let unpaidPoolNaira = 0;
  if (!earningsRes.error && Array.isArray(earningsRes.data)) {
    for (const row of earningsRes.data as Array<any>) {
      const amt = Number(row.amount_naira ?? 0);
      unpaidPoolNaira += amt;
      if (row.cleaner_id) {
        const prev = unpaidByPro.get(row.cleaner_id) ?? {
          name: row.cleaner?.full_name ?? "Cleanse Pro",
          code: row.cleaner?.cleaner_code ?? "",
          total: 0,
        };
        prev.total += amt;
        unpaidByPro.set(row.cleaner_id, prev);
      }
    }
  }

  const bankSet = new Set<string>(
    !banksRes.error && Array.isArray(banksRes.data)
      ? (banksRes.data as Array<{ cleaner_id: string }>).map((b) => b.cleaner_id)
      : []
  );

  for (const [cid, info] of unpaidByPro.entries()) {
    if (info.total > 0 && !bankSet.has(cid)) {
      attention.push({
        id: `bank-${cid}`,
        kind: "PAYOUT_MISSING_BANK",
        tone: "red",
        title: `Missing bank details · ${info.name}`,
        detail: `${info.code} has ₦${info.total.toLocaleString("en-NG")} owed — ask them to add bank details on /pro/profile.`,
        href: `/admin/cleaners/${cid}`,
        cta: "Open Pro Profile →",
      });
    }
  }

  // Today's scheduled visits ordered chronologically by slot
  const SLOT_ORDER: Record<string, number> = {
    "8am - 11am": 1,
    "11am - 2pm": 2,
    "2pm - 5pm": 3,
  };
  const rawTodayVisits =
    visitsRes.error && isMissingJobSchemaError(visitsRes.error) ? [] : ((visitsRes.data ?? []) as Array<any>);

  const todayVisits: TodayVisitItem[] = rawTodayVisits
    .map((v) => {
      const job = jobMap.get(v.job_id);
      if (!job || job.status === "ENDED" || job.status === "TERMINATED") return null;
      return {
        visitId: v.id,
        jobId: v.job_id,
        invoiceNumber: job.invoice_number,
        slot: v.slot,
        visitStatus: v.status,
        clientName: job.client_name || "Unnamed Client",
        clientArea: job.client_area || "Ibadan",
        serviceName: job.service_name,
        cleaners: jobCleanersMap.get(v.job_id) ?? [],
        poolNaira: Number(job.cleaner_pool_per_clean_naira ?? 0),
      } satisfies TodayVisitItem;
    })
    .filter((item): item is TodayVisitItem => item !== null)
    .sort((a, b) => (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9));

  const todayServed = todayVisits.filter((v) => v.visitStatus === "SERVED").length;
  const todayUpcoming = todayVisits.filter((v) => v.visitStatus !== "SERVED").length;

  const recentJobs: OverviewRecentJob[] = jobs.slice(0, 6).map((j) => ({
    id: j.id,
    invoice_number: j.invoice_number,
    client_name: j.client_name || "Unnamed Client",
    client_area: j.client_area || "—",
    service_name: j.service_name,
    status: j.status,
    cleaner_count: (jobCleanersMap.get(j.id) ?? []).length,
    contract_end: j.contract_end ?? null,
  }));

  const payoutRows =
    payoutsRes.error && isMissingJobSchemaError(payoutsRes.error)
      ? []
      : ((payoutsRes.data ?? []) as Array<any>);
  const paidSummary = summarizeMonthlyPayouts(payoutRows, todayIso.slice(0, 7));

  return {
    todayIso,
    counts: {
      jobsActionNeeded: flaggedJobIds.size,
      onboardingsPending: onboardings.length,
      applicantsNew: applicants.length,
      payoutsDuePros: unpaidByPro.size,
    },
    kpis: {
      todayTotal: todayVisits.length,
      todayServed,
      todayUpcoming,
      activeJobsCount,
      jobsActionNeeded: flaggedJobIds.size,
      activeProsCount: activeProsRes.count ?? 0,
      hiringQueueCount: onboardings.length + applicants.length,
      unpaidPoolNaira,
      unpaidProsCount: unpaidByPro.size,
      currentMonthLabel: paidSummary.current_month_label,
      paidThisMonthNaira: paidSummary.this_month_paid_naira,
      paidThisMonthWorkersCount: paidSummary.this_month_workers_paid_count,
      paidTotalAllTimeNaira: paidSummary.cumulative_paid_naira,
      paidWorkersAllTimeCount: paidSummary.cumulative_workers_paid_count,
    },
    attention: attention.slice(0, 12),
    todayVisits,
    recentJobs,
  };
}

