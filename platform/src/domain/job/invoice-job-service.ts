/**
 * InvoiceJobService — automatically creates and synchronizes operational Jobs,
 * cleaner assignments (up to 2 onboarded Cleanse Pros), scheduled visit logs,
 * and subscription lifecycle states (`PENDING | ACTIVE | PAUSED | ENDED | TERMINATED`)
 * from saved invoices.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import type { AdminContext } from "@/auth/admin";
import {
  expandInvoiceVisits,
  isValidIsoDate,
  lagosTodayIso,
  type CanonicalSlot,
} from "@/domain/invoice/schedule";
import {
  computeInvoiceJobEconomics,
  isAddressUnlockedForSlot,
  JOB_STATUSES,
  splitCleanerPool,
  targetStatusForUnservedVisit,
  type JobStatus,
  type VisitStatus,
} from "./pricing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isMissingJobSchemaError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /invoice_jobs|invoice_job_visits|invoice_job_cleaners|cleaner_bank_accounts|cleaner_payouts|cleaner_visit_earnings|does not exist|schema cache/i.test(
      err.message ?? ""
    )
  );
}

function uniqueCleanUuids(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const s = String(item ?? "").trim();
    if (!UUID.test(s) || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= 2) break;
  }
  return out;
}

function parseStatus(raw: unknown, fallback: JobStatus = "ACTIVE"): JobStatus {
  const up = String(raw ?? "").trim().toUpperCase();
  return (JOB_STATUSES as readonly string[]).includes(up) ? (up as JobStatus) : fallback;
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  const n = parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolveServiceName(data: Record<string, unknown>): string {
  if (data.svc === "__custom") {
    const custom = String(data.svcCustom ?? "").trim();
    return custom || "Custom Cleaning Service";
  }
  const s = String(data.svc ?? "").trim();
  return s || "Residential Home Cleaning";
}

export interface SelectableCleaner {
  id: string;
  cleaner_code: string;
  full_name: string;
  account_status: string;
  verified: boolean;
}

/**
 * Lists already-onboarded Cleanse Pros eligible for assignment in the Invoice Maker
 * and Jobs panel (excludes SUSPENDED / FIRED).
 */
export async function listSelectableCleaners(): Promise<SelectableCleaner[]> {
  const { data, error } = await serviceClient()
    .from("cleaners")
    .select("id, cleaner_code, full_name, account_status, verified")
    .in("account_status", ["ACTIVE", "ONBOARDING", "INACTIVE"])
    .order("full_name", { ascending: true });

  if (error) {
    console.error("listSelectableCleaners.error", error.message);
    return [];
  }
  const orderWeight: Record<string, number> = { ACTIVE: 0, ONBOARDING: 1, INACTIVE: 2 };
  return ((data ?? []) as SelectableCleaner[]).sort(
    (a, b) =>
      (orderWeight[a.account_status] ?? 9) - (orderWeight[b.account_status] ?? 9) ||
      a.full_name.localeCompare(b.full_name)
  );
}

async function validateCleanerIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { data, error } = await serviceClient()
    .from("cleaners")
    .select("id")
    .in("id", ids);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not verify assigned Cleanse Pros.");
  const found = new Set((data ?? []).map((r: { id: string }) => r.id));
  for (const id of ids) {
    if (!found.has(id)) {
      throw new AppError("VALIDATION_ERROR", "One of the selected Cleanse Pros was not found.");
    }
  }
}

/**
 * Creates or updates the operational job, assigned cleaners (max 2), and
 * scheduled visit log whenever an invoice is saved or updated.
 */
export async function syncJobFromInvoice(
  invoice: { id: string; invoice_number: string; total_naira: number },
  data: Record<string, unknown>,
  admin: AdminContext
): Promise<{ synced: boolean; schemaReady: boolean; jobId?: string }> {
  const db = serviceClient();
  const todayIso = lagosTodayIso();

  const existingRes = await db
    .from("invoice_jobs")
    .select("id, status, paused_at, ended_at, terminated_at, status_reason")
    .eq("invoice_id", invoice.id)
    .maybeSingle();

  if (existingRes.error) {
    if (isMissingJobSchemaError(existingRes.error)) {
      return { synced: false, schemaReady: false };
    }
    throw new AppError("INTERNAL_ERROR", "Could not sync job for this invoice.");
  }

  const existingJob = existingRes.data as {
    id: string;
    status: JobStatus;
    paused_at: string | null;
    ended_at: string | null;
    terminated_at: string | null;
    status_reason: string | null;
  } | null;

  const cleanerIds = uniqueCleanUuids(data.cleanerIds);
  await validateCleanerIds(cleanerIds);

  const nextStatus = parseStatus(data.jobStatus, existingJob?.status ?? "ACTIVE");
  const bedrooms = parsePositiveInt(data.beds, 3);
  const billing = data.billing === "oneoff" ? "oneoff" : "monthly";
  const sessionsCount = billing === "oneoff" ? 1 : parsePositiveInt(data.sessions, 4);
  const materialsBy = data.mat === "client" ? "client" : "cleanse";
  const equipmentBy = data.equip === "cleanse" ? "cleanse" : "client";

  const econ = computeInvoiceJobEconomics({
    totalNaira: Number(invoice.total_naira || 0),
    sessionsCount,
    bedrooms,
    materialsBy,
    cleanerCount: cleanerIds.length || 1,
  });

  const nowIso = new Date().toISOString();
  const statusChanged = existingJob ? existingJob.status !== nextStatus : true;
  const pausedAt =
    nextStatus === "PAUSED" ? (statusChanged ? nowIso : existingJob?.paused_at ?? nowIso) : existingJob?.paused_at ?? null;
  const endedAt =
    nextStatus === "ENDED" ? (statusChanged ? nowIso : existingJob?.ended_at ?? nowIso) : null;
  const terminatedAt =
    nextStatus === "TERMINATED"
      ? statusChanged
        ? nowIso
        : existingJob?.terminated_at ?? nowIso
      : null;

  const jobPayload = {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    status: nextStatus,
    client_name: String(data.client ?? "").trim() || null,
    client_phone: String(data.phone ?? "").trim() || null,
    client_address: String(data.addr ?? "").trim() || null,
    client_area: String(data.area ?? "").trim() || null,
    service_name: resolveServiceName(data),
    property_bedrooms: bedrooms,
    billing,
    frequency: billing === "monthly" ? String(data.freq ?? "").trim() || null : "One-off",
    sessions_count: econ.sessionsCount,
    materials_by: materialsBy,
    equipment_by: equipmentBy,
    contract_start: isValidIsoDate(data.startDate) ? data.startDate.trim() : null,
    contract_end: isValidIsoDate(data.endDate) ? data.endDate.trim() : null,
    serving_slot: String(data.visitSlot ?? "").trim() || null,
    serving_days: Array.isArray(data.visitDays) ? data.visitDays : [],
    invoice_total_naira: econ.invoiceTotalNaira,
    price_per_clean_naira: econ.pricePerCleanNaira,
    supplies_per_visit_naira: econ.suppliesPerVisitNaira,
    cleaner_pool_per_clean_naira: econ.cleanerPoolPerCleanNaira,
    reserve_calendar: data.reserveCalendar !== false,
    paused_at: pausedAt,
    ended_at: endedAt,
    terminated_at: terminatedAt,
    created_by: existingJob ? undefined : admin.adminId,
    updated_by: admin.adminId,
    updated_at: nowIso,
  };

  const { data: upserted, error: upsertErr } = await db
    .from("invoice_jobs")
    .upsert(jobPayload, { onConflict: "invoice_id" })
    .select("id")
    .single();

  if (upsertErr || !upserted) {
    throw new AppError("INTERNAL_ERROR", "Could not save operational job record.");
  }
  const jobId = upserted.id as string;

  // Replace cleaner assignments (up to 2).
  await db.from("invoice_job_cleaners").delete().eq("job_id", jobId);
  if (cleanerIds.length > 0) {
    const { error: jcErr } = await db.from("invoice_job_cleaners").insert(
      cleanerIds.map((cid, idx) => ({
        job_id: jobId,
        cleaner_id: cid,
        slot_order: idx + 1,
      }))
    );
    if (jcErr) throw new AppError("INTERNAL_ERROR", "Could not assign Cleanse Pros to job.");
  }

  // Sync visits while preserving any SERVED history cleanly.
  const desiredVisits = expandInvoiceVisits(data, { includeUnreserved: true });
  const { data: currentVisitsRaw } = await db
    .from("invoice_job_visits")
    .select("id, visit_date, slot, status")
    .eq("job_id", jobId);

  const currentVisits = (currentVisitsRaw ?? []) as Array<{
    id: string;
    visit_date: string;
    slot: CanonicalSlot;
    status: VisitStatus;
  }>;

  const desiredKeys = new Set(desiredVisits.map((v) => `${v.date}|${v.slot}`));
  const currentByKey = new Map<string, (typeof currentVisits)[number]>();
  for (const cv of currentVisits) {
    currentByKey.set(`${cv.visit_date}|${cv.slot}`, cv);
  }

  const removeIds = currentVisits
    .filter((cv) => cv.status !== "SERVED" && !desiredKeys.has(`${cv.visit_date}|${cv.slot}`))
    .map((cv) => cv.id);

  if (removeIds.length > 0) {
    await db.from("invoice_job_visits").delete().in("id", removeIds);
  }

  const toInsert = desiredVisits
    .filter((dv) => !currentByKey.has(`${dv.date}|${dv.slot}`))
    .map((dv) => ({
      job_id: jobId,
      visit_date: dv.date,
      slot: dv.slot,
      status: targetStatusForUnservedVisit(nextStatus, "SCHEDULED", dv.date, todayIso),
    }));

  if (toInsert.length > 0) {
    const { error: insErr } = await db.from("invoice_job_visits").insert(toInsert);
    if (insErr) throw new AppError("INTERNAL_ERROR", "Could not generate scheduled job visits.");
  }

  // If subscription status changed via Invoice Maker, transition kept unserved visits.
  for (const cv of currentVisits) {
    if (!desiredKeys.has(`${cv.visit_date}|${cv.slot}`)) continue;
    const nextVStatus = targetStatusForUnservedVisit(nextStatus, cv.status, cv.visit_date, todayIso);
    if (nextVStatus !== cv.status) {
      await db
        .from("invoice_job_visits")
        .update({ status: nextVStatus, updated_at: nowIso })
        .eq("id", cv.id);
    }
  }

  return { synced: true, schemaReady: true, jobId };
}

export interface AdminJobListItem {
  id: string;
  invoice_id: string;
  invoice_number: string;
  status: JobStatus;
  client_name: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_area: string | null;
  service_name: string;
  property_bedrooms: number;
  billing: string;
  frequency: string | null;
  sessions_count: number;
  materials_by: string;
  contract_start: string | null;
  contract_end: string | null;
  invoice_total_naira: number;
  price_per_clean_naira: number;
  supplies_per_visit_naira: number;
  cleaner_pool_per_clean_naira: number;
  plan_cleaner_cut_naira: number;
  cleaners: Array<{
    cleaner_id: string;
    cleaner_code: string;
    full_name: string;
    slot_order: number;
    per_clean_share_naira: number;
  }>;
  visits_total: number;
  visits_served: number;
  visits_scheduled: number;
  next_visit: { visit_date: string; slot: string } | null;
  earned_so_far_naira: number;
  unpaid_earned_naira: number;
  suggested_end: boolean;
  updated_at: string;
}

export async function listInvoiceJobs(filters?: {
  status?: string;
  search?: string;
}): Promise<{ schemaReady: boolean; jobs: AdminJobListItem[] }> {
  const db = serviceClient();
  const todayIso = lagosTodayIso();

  let query = db
    .from("invoice_jobs")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(300);

  if (filters?.status && (JOB_STATUSES as readonly string[]).includes(filters.status)) {
    query = query.eq("status", filters.status);
  }
  if (filters?.search && filters.search.trim()) {
    const term = filters.search.trim().replace(/[,()%*]/g, " ");
    query = query.or(
      `invoice_number.ilike.%${term}%,client_name.ilike.%${term}%,client_address.ilike.%${term}%,client_phone.ilike.%${term}%`
    );
  }

  const { data: jobsRaw, error } = await query;
  if (error) {
    if (isMissingJobSchemaError(error)) return { schemaReady: false, jobs: [] };
    throw new AppError("INTERNAL_ERROR", "Could not load jobs.");
  }

  const jobs = (jobsRaw ?? []) as Array<Record<string, any>>;
  if (jobs.length === 0) return { schemaReady: true, jobs: [] };

  const jobIds = jobs.map((j) => j.id as string);
  const [cleanersRes, visitsRes] = await Promise.all([
    db
      .from("invoice_job_cleaners")
      .select("job_id, cleaner_id, slot_order, cleaner:cleaners(cleaner_code, full_name)")
      .in("job_id", jobIds)
      .order("slot_order", { ascending: true }),
    db
      .from("invoice_job_visits")
      .select("id, job_id, visit_date, slot, status")
      .in("job_id", jobIds)
      .order("visit_date", { ascending: true }),
  ]);

  const visits = (visitsRes.data ?? []) as Array<{
    id: string;
    job_id: string;
    visit_date: string;
    slot: string;
    status: VisitStatus;
  }>;
  const visitIds = visits.map((v) => v.id);

  let earnings: Array<{ invoice_visit_id: string; amount_naira: number; payout_id: string | null }> = [];
  if (visitIds.length > 0) {
    const earnRes = await db
      .from("cleaner_visit_earnings")
      .select("invoice_visit_id, amount_naira, payout_id")
      .in("invoice_visit_id", visitIds);
    earnings = (earnRes.data ?? []) as typeof earnings;
  }

  const cleanersByJob = new Map<string, Array<Record<string, any>>>();
  for (const c of cleanersRes.data ?? []) {
    const arr = cleanersByJob.get(c.job_id) ?? [];
    arr.push(c);
    cleanersByJob.set(c.job_id, arr);
  }

  const visitsByJob = new Map<string, typeof visits>();
  const jobIdByVisit = new Map<string, string>();
  for (const v of visits) {
    const arr = visitsByJob.get(v.job_id) ?? [];
    arr.push(v);
    visitsByJob.set(v.job_id, arr);
    jobIdByVisit.set(v.id, v.job_id);
  }

  const earnedByJob = new Map<string, { total: number; unpaid: number }>();
  for (const e of earnings) {
    const jid = jobIdByVisit.get(e.invoice_visit_id);
    if (!jid) continue;
    const prev = earnedByJob.get(jid) ?? { total: 0, unpaid: 0 };
    const amt = Number(e.amount_naira || 0);
    prev.total += amt;
    if (!e.payout_id) prev.unpaid += amt;
    earnedByJob.set(jid, prev);
  }

  const out: AdminJobListItem[] = jobs.map((j) => {
    const assigned = cleanersByJob.get(j.id) ?? [];
    const pool = Number(j.cleaner_pool_per_clean_naira || 0);
    const splits = splitCleanerPool(pool, assigned.length);
    const jVisits = visitsByJob.get(j.id) ?? [];
    const scheduledFuture = jVisits.filter((v) => v.status === "SCHEDULED" && v.visit_date >= todayIso);
    const earned = earnedByJob.get(j.id) ?? { total: 0, unpaid: 0 };
    const sessions = Math.max(1, Number(j.sessions_count || 1));

    return {
      id: j.id,
      invoice_id: j.invoice_id,
      invoice_number: j.invoice_number,
      status: j.status as JobStatus,
      client_name: j.client_name ?? null,
      client_phone: j.client_phone ?? null,
      client_address: j.client_address ?? null,
      client_area: j.client_area ?? null,
      service_name: j.service_name,
      property_bedrooms: Number(j.property_bedrooms || 1),
      billing: j.billing,
      frequency: j.frequency ?? null,
      sessions_count: sessions,
      materials_by: j.materials_by,
      contract_start: j.contract_start ?? null,
      contract_end: j.contract_end ?? null,
      invoice_total_naira: Number(j.invoice_total_naira || 0),
      price_per_clean_naira: Number(j.price_per_clean_naira || 0),
      supplies_per_visit_naira: Number(j.supplies_per_visit_naira || 0),
      cleaner_pool_per_clean_naira: pool,
      plan_cleaner_cut_naira: pool * sessions,
      cleaners: assigned.map((c, idx) => ({
        cleaner_id: c.cleaner_id,
        cleaner_code: c.cleaner?.cleaner_code ?? "",
        full_name: c.cleaner?.full_name ?? "Cleanse Pro",
        slot_order: c.slot_order,
        per_clean_share_naira: splits[idx]?.amountNaira ?? 0,
      })),
      visits_total: jVisits.length,
      visits_served: jVisits.filter((v) => v.status === "SERVED").length,
      visits_scheduled: jVisits.filter((v) => v.status === "SCHEDULED").length,
      next_visit: scheduledFuture[0]
        ? { visit_date: scheduledFuture[0].visit_date, slot: scheduledFuture[0].slot }
        : null,
      earned_so_far_naira: earned.total,
      unpaid_earned_naira: earned.unpaid,
      suggested_end: Boolean(
        j.status === "ACTIVE" &&
          j.contract_end &&
          String(j.contract_end) < todayIso &&
          scheduledFuture.length === 0
      ),
      updated_at: j.updated_at,
    };
  });

  return { schemaReady: true, jobs: out };
}

export async function getInvoiceJob(jobId: string) {
  if (!UUID.test(jobId)) throw new AppError("NOT_FOUND", "Job not found.");
  const db = serviceClient();

  const { data: job, error } = await db
    .from("invoice_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    if (isMissingJobSchemaError(error)) {
      throw new AppError("INTERNAL_ERROR", "Run migration 0015_jobs_and_payouts.sql first.");
    }
    throw new AppError("INTERNAL_ERROR", "Could not load job.");
  }
  if (!job) throw new AppError("NOT_FOUND", "Job not found.");

  const [cleanersRes, visitsRes, selectable] = await Promise.all([
    db
      .from("invoice_job_cleaners")
      .select("cleaner_id, slot_order, cleaner:cleaners(id, cleaner_code, full_name, phone_e164, account_status)")
      .eq("job_id", jobId)
      .order("slot_order", { ascending: true }),
    db
      .from("invoice_job_visits")
      .select("*")
      .eq("job_id", jobId)
      .order("visit_date", { ascending: true })
      .order("slot", { ascending: true }),
    listSelectableCleaners(),
  ]);

  const visits = (visitsRes.data ?? []) as Array<Record<string, any>>;
  const visitIds = visits.map((v) => v.id as string);
  let earningsRows: Array<Record<string, any>> = [];
  if (visitIds.length > 0) {
    const eRes = await db
      .from("cleaner_visit_earnings")
      .select("id, invoice_visit_id, cleaner_id, amount_naira, share_bps, payout_id, cleaner:cleaners(full_name)")
      .in("invoice_visit_id", visitIds);
    earningsRows = eRes.data ?? [];
  }

  const earningsByVisit = new Map<string, Array<Record<string, any>>>();
  for (const e of earningsRows) {
    const arr = earningsByVisit.get(e.invoice_visit_id) ?? [];
    arr.push(e);
    earningsByVisit.set(e.invoice_visit_id, arr);
  }

  const assigned = (cleanersRes.data ?? []) as Array<Record<string, any>>;
  const pool = Number(job.cleaner_pool_per_clean_naira || 0);
  const splits = splitCleanerPool(pool, assigned.length);
  const todayIso = lagosTodayIso();

  return {
    job: {
      ...job,
      plan_cleaner_cut_naira: pool * Math.max(1, Number(job.sessions_count || 1)),
      suggested_end: Boolean(
        job.status === "ACTIVE" &&
          job.contract_end &&
          String(job.contract_end) < todayIso &&
          visits.filter((v) => v.status === "SCHEDULED" && v.visit_date >= todayIso).length === 0
      ),
    },
    cleaners: assigned.map((c, idx) => ({
      cleaner_id: c.cleaner_id as string,
      slot_order: c.slot_order as number,
      cleaner_code: c.cleaner?.cleaner_code ?? "",
      full_name: c.cleaner?.full_name ?? "Cleanse Pro",
      phone_e164: c.cleaner?.phone_e164 ?? "",
      account_status: c.cleaner?.account_status ?? "ACTIVE",
      per_clean_share_naira: splits[idx]?.amountNaira ?? 0,
    })),
    visits: visits.map((v) => {
      const vEarnings = earningsByVisit.get(v.id) ?? [];
      return {
        ...v,
        id: String(v.id),
        job_id: String(v.job_id),
        visit_date: String(v.visit_date),
        slot: String(v.slot),
        status: String(v.status),
        served_at: (v.served_at as string | null) ?? null,
        notes: (v.notes as string | null) ?? null,
        earnings: vEarnings.map((e) => ({
          id: String(e.id),
          cleaner_id: String(e.cleaner_id),
          cleaner_name: e.cleaner?.full_name ?? "Cleanse Pro",
          amount_naira: Number(e.amount_naira || 0),
          share_bps: Number(e.share_bps || 10000),
          payout_id: (e.payout_id as string | null) ?? null,
        })),
        locked_paid: vEarnings.some((e) => Boolean(e.payout_id)),
      };
    }),
    selectable_cleaners: selectable,
  };
}

async function patchInvoiceJsonData(invoiceId: string, patch: Record<string, unknown>, admin: AdminContext) {
  const db = serviceClient();
  const { data: inv } = await db
    .from("invoices")
    .select("data")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return;
  const merged = { ...(inv.data as Record<string, unknown>), ...patch };
  await db
    .from("invoices")
    .update({ data: merged, updated_by: admin.adminId, updated_at: new Date().toISOString() })
    .eq("id", invoiceId);
}

/**
 * Transitions subscription/job lifecycle state (`PENDING | ACTIVE | PAUSED | ENDED | TERMINATED`).
 * Preserves all SERVED visits & earned amounts while freeing/restoring unserved visits on the calendar.
 */
export async function updateInvoiceJobStatus(
  jobId: string,
  nextStatus: JobStatus,
  admin: AdminContext,
  reason?: string
) {
  if (!UUID.test(jobId)) throw new AppError("NOT_FOUND", "Job not found.");
  const db = serviceClient();
  const todayIso = lagosTodayIso();
  const nowIso = new Date().toISOString();

  const { data: job, error } = await db
    .from("invoice_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !job) throw new AppError("NOT_FOUND", "Job not found.");

  const { data: visits } = await db
    .from("invoice_job_visits")
    .select("id, visit_date, status")
    .eq("job_id", jobId);

  for (const v of visits ?? []) {
    const nextV = targetStatusForUnservedVisit(
      nextStatus,
      v.status as VisitStatus,
      v.visit_date as string,
      todayIso
    );
    if (nextV !== v.status) {
      await db
        .from("invoice_job_visits")
        .update({ status: nextV, updated_at: nowIso })
        .eq("id", v.id);
    }
  }

  const cleanReason = reason?.trim() || null;
  const patch: Record<string, unknown> = {
    status: nextStatus,
    status_reason: cleanReason ?? job.status_reason,
    updated_by: admin.adminId,
    updated_at: nowIso,
  };
  if (nextStatus === "PAUSED") patch.paused_at = nowIso;
  if (nextStatus === "ACTIVE") {
    patch.ended_at = null;
    patch.terminated_at = null;
  }
  if (nextStatus === "ENDED") patch.ended_at = nowIso;
  if (nextStatus === "TERMINATED") patch.terminated_at = nowIso;

  await db.from("invoice_jobs").update(patch).eq("id", jobId);
  await patchInvoiceJsonData(job.invoice_id, { jobStatus: nextStatus }, admin);

  await db.from("audit_logs").insert({
    actor_auth_user_id: admin.authUserId,
    action: "invoice_job.status_changed",
    entity_type: "invoice_job",
    entity_id: jobId,
    after_data: { status: nextStatus, reason: cleanReason },
  });

  return { id: jobId, status: nextStatus };
}

export async function updateInvoiceJobCleaners(
  jobId: string,
  cleanerIdsRaw: string[],
  admin: AdminContext
) {
  if (!UUID.test(jobId)) throw new AppError("NOT_FOUND", "Job not found.");
  const db = serviceClient();
  const cleanerIds = uniqueCleanUuids(cleanerIdsRaw);
  await validateCleanerIds(cleanerIds);

  const { data: job } = await db
    .from("invoice_jobs")
    .select("id, invoice_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) throw new AppError("NOT_FOUND", "Job not found.");

  await db.from("invoice_job_cleaners").delete().eq("job_id", jobId);
  if (cleanerIds.length > 0) {
    await db.from("invoice_job_cleaners").insert(
      cleanerIds.map((cid, idx) => ({
        job_id: jobId,
        cleaner_id: cid,
        slot_order: idx + 1,
      }))
    );
  }

  await db
    .from("invoice_jobs")
    .update({ updated_by: admin.adminId, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  await patchInvoiceJsonData(job.invoice_id, { cleanerIds }, admin);

  await db.from("audit_logs").insert({
    actor_auth_user_id: admin.authUserId,
    action: "invoice_job.cleaners_updated",
    entity_type: "invoice_job",
    entity_id: jobId,
    after_data: { cleaner_ids: cleanerIds },
  });

  return { id: jobId, cleaner_ids: cleanerIds };
}

/**
 * Operator marks an individual visit as SERVED (accruing 70% cleaner earnings ledger rows
 * split across the attending cleaners) or reverses an UNPAID visit back to SCHEDULED/CANCELLED.
 */
export async function markInvoiceVisitStatus(
  jobId: string,
  visitId: string,
  input: {
    action: "SERVED" | "UNSERVED" | "CANCELLED" | "SCHEDULED";
    cleaner_ids?: string[];
    notes?: string;
  },
  admin: AdminContext
) {
  if (!UUID.test(jobId) || !UUID.test(visitId)) {
    throw new AppError("NOT_FOUND", "Job or visit not found.");
  }
  const db = serviceClient();
  const nowIso = new Date().toISOString();

  const [jobRes, visitRes, existingEarnRes] = await Promise.all([
    db.from("invoice_jobs").select("*").eq("id", jobId).maybeSingle(),
    db.from("invoice_job_visits").select("*").eq("id", visitId).eq("job_id", jobId).maybeSingle(),
    db.from("cleaner_visit_earnings").select("id, payout_id").eq("invoice_visit_id", visitId),
  ]);

  const job = jobRes.data;
  const visit = visitRes.data;
  if (!job || !visit) throw new AppError("NOT_FOUND", "Visit not found.");

  const existingEarnings = (existingEarnRes.data ?? []) as Array<{ id: string; payout_id: string | null }>;
  if (existingEarnings.some((e) => Boolean(e.payout_id))) {
    throw new AppError(
      "FORBIDDEN",
      "This visit has already been included in a confirmed monthly payout and cannot be altered."
    );
  }

  if (input.action === "SERVED") {
    let attending = uniqueCleanUuids(input.cleaner_ids);
    if (attending.length === 0) {
      const { data: assigned } = await db
        .from("invoice_job_cleaners")
        .select("cleaner_id")
        .eq("job_id", jobId)
        .order("slot_order", { ascending: true });
      attending = (assigned ?? []).map((r: { cleaner_id: string }) => r.cleaner_id);
    } else {
      await validateCleanerIds(attending);
    }

    if (attending.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Assign at least one Cleanse Pro (or select who served) before marking this visit Served."
      );
    }

    const econ = computeInvoiceJobEconomics({
      totalNaira: Number(job.invoice_total_naira || 0),
      sessionsCount: Number(job.sessions_count || 1),
      bedrooms: Number(job.property_bedrooms || 1),
      materialsBy: job.materials_by,
      cleanerCount: attending.length,
    });

    // Replace any existing unpaid ledger rows for this visit cleanly.
    await db
      .from("cleaner_visit_earnings")
      .delete()
      .eq("invoice_visit_id", visitId)
      .is("payout_id", null);

    const jobLabel = `${job.invoice_number} · ${job.service_name} (${job.property_bedrooms}BR)`;
    const rowsToInsert = attending.map((cid, idx) => ({
      source_type: "INVOICE_VISIT",
      invoice_visit_id: visitId,
      booking_id: null,
      cleaner_id: cid,
      job_label: jobLabel,
      earned_on: visit.visit_date,
      gross_clean_naira: econ.pricePerCleanNaira,
      supplies_deducted_naira: econ.suppliesPerVisitNaira,
      net_pool_naira: econ.cleanerPoolPerCleanNaira,
      share_bps: econ.cleanerSplits[idx]?.shareBps ?? 10000,
      amount_naira: econ.cleanerSplits[idx]?.amountNaira ?? econ.cleanerPoolPerCleanNaira,
      payout_id: null,
    }));

    const { error: earnErr } = await db.from("cleaner_visit_earnings").insert(rowsToInsert);
    if (earnErr) throw new AppError("INTERNAL_ERROR", "Could not record cleaner earnings.");

    await db
      .from("invoice_job_visits")
      .update({
        status: "SERVED",
        served_at: nowIso,
        served_by_admin_id: admin.adminId,
        notes: input.notes?.trim() || visit.notes,
        updated_at: nowIso,
      })
      .eq("id", visitId);

    return { visit_id: visitId, status: "SERVED" as VisitStatus, earnings: rowsToInsert };
  }

  // UNSERVED -> SCHEDULED, or explicit SCHEDULED / CANCELLED
  const target: VisitStatus = input.action === "CANCELLED" ? "CANCELLED" : "SCHEDULED";
  await db
    .from("cleaner_visit_earnings")
    .delete()
    .eq("invoice_visit_id", visitId)
    .is("payout_id", null);

  await db
    .from("invoice_job_visits")
    .update({
      status: target,
      served_at: null,
      served_by_admin_id: null,
      notes: input.notes?.trim() ?? visit.notes,
      updated_at: nowIso,
    })
    .eq("id", visitId);

  return { visit_id: visitId, status: target };
}

export interface CleanerProVisit {
  visit_id: string;
  job_id: string;
  invoice_number: string;
  visit_date: string;
  slot: CanonicalSlot;
  service_name: string;
  property_bedrooms: number;
  client_name: string | null;
  client_address: string | null;
  client_area: string | null;
  address_unlocked: boolean;
  unlock_label: string;
  materials_by: string;
  equipment_by: string;
  your_cut_naira: number;
  co_cleaner_name: string | null;
}

export interface CleanerProJobSummary {
  job_id: string;
  invoice_number: string;
  status: JobStatus;
  service_name: string;
  property_bedrooms: number;
  billing: string;
  frequency: string | null;
  client_name: string | null;
  client_address: string | null;
  client_area: string | null;
  address_unlocked: boolean;
  your_cut_per_clean_naira: number;
  co_cleaner_name: string | null;
  upcoming_visits: Array<{ visit_id: string; visit_date: string; slot: CanonicalSlot }>;
}

/**
 * View-only schedule for Cleanse Pro (/pro/home).
 * Strictly NEVER includes client_phone, internal total_naira, or supplies deductions.
 */
export async function listCleanerProSchedule(cleanerId: string): Promise<{
  schemaReady: boolean;
  nextVisit: CleanerProVisit | null;
  upcomingVisits: CleanerProVisit[];
  assignedJobs: CleanerProJobSummary[];
}> {
  const db = serviceClient();
  const todayIso = lagosTodayIso();

  const { data: myLinks, error } = await db
    .from("invoice_job_cleaners")
    .select("job_id, slot_order")
    .eq("cleaner_id", cleanerId);

  if (error) {
    if (isMissingJobSchemaError(error)) {
      return { schemaReady: false, nextVisit: null, upcomingVisits: [], assignedJobs: [] };
    }
    return { schemaReady: true, nextVisit: null, upcomingVisits: [], assignedJobs: [] };
  }

  const links = (myLinks ?? []) as Array<{ job_id: string; slot_order: number }>;
  if (links.length === 0) {
    return { schemaReady: true, nextVisit: null, upcomingVisits: [], assignedJobs: [] };
  }

  const jobIds = links.map((l) => l.job_id);
  const slotByJob = new Map(links.map((l) => [l.job_id, l.slot_order]));

  const [jobsRes, allCleanersRes, visitsRes] = await Promise.all([
    db
      .from("invoice_jobs")
      .select(
        "id, invoice_number, status, client_name, client_address, client_area, service_name, property_bedrooms, billing, frequency, materials_by, equipment_by, cleaner_pool_per_clean_naira"
      )
      .in("id", jobIds)
      .eq("status", "ACTIVE"),
    db
      .from("invoice_job_cleaners")
      .select("job_id, cleaner_id, slot_order, cleaner:cleaners(full_name)")
      .in("job_id", jobIds)
      .order("slot_order", { ascending: true }),
    db
      .from("invoice_job_visits")
      .select("id, job_id, visit_date, slot, status")
      .in("job_id", jobIds)
      .eq("status", "SCHEDULED")
      .gte("visit_date", todayIso)
      .order("visit_date", { ascending: true })
      .order("slot", { ascending: true }),
  ]);

  const activeJobs = (jobsRes.data ?? []) as Array<Record<string, any>>;
  const activeJobMap = new Map(activeJobs.map((j) => [j.id as string, j]));

  const teamByJob = new Map<string, Array<{ cleaner_id: string; full_name: string }>>();
  for (const row of (allCleanersRes.data ?? []) as Array<Record<string, any>>) {
    const arr = teamByJob.get(row.job_id) ?? [];
    arr.push({ cleaner_id: row.cleaner_id, full_name: row.cleaner?.full_name ?? "Cleanse Pro" });
    teamByJob.set(row.job_id, arr);
  }

  const upcomingVisits: CleanerProVisit[] = [];
  const visitsByJob = new Map<string, Array<{ visit_id: string; visit_date: string; slot: CanonicalSlot }>>();
  const unlockedByJob = new Set<string>();

  for (const v of (visitsRes.data ?? []) as Array<Record<string, any>>) {
    const job = activeJobMap.get(v.job_id);
    if (!job) continue;
    const team = teamByJob.get(v.job_id) ?? [];
    const splits = splitCleanerPool(Number(job.cleaner_pool_per_clean_naira || 0), team.length);
    const myIdx = team.findIndex((t) => t.cleaner_id === cleanerId);
    const myShare =
      myIdx >= 0
        ? splits[myIdx]?.amountNaira ?? 0
        : splits[(slotByJob.get(v.job_id) ?? 1) - 1]?.amountNaira ?? 0;
    const partner = team.find((t) => t.cleaner_id !== cleanerId);
    const gate = isAddressUnlockedForSlot(v.visit_date, v.slot);
    if (gate.unlocked) unlockedByJob.add(v.job_id);

    const item: CleanerProVisit = {
      visit_id: v.id,
      job_id: v.job_id,
      invoice_number: job.invoice_number,
      visit_date: v.visit_date,
      slot: v.slot as CanonicalSlot,
      service_name: job.service_name,
      property_bedrooms: Number(job.property_bedrooms || 1),
      client_name: job.client_name ?? null,
      client_address: gate.unlocked ? (job.client_address ?? null) : null,
      client_area: job.client_area ?? null,
      address_unlocked: gate.unlocked,
      unlock_label: gate.unlockTimeLabel,
      materials_by: job.materials_by,
      equipment_by: job.equipment_by,
      your_cut_naira: myShare,
      co_cleaner_name: partner?.full_name ?? null,
    };
    upcomingVisits.push(item);

    const list = visitsByJob.get(v.job_id) ?? [];
    list.push({ visit_id: v.id, visit_date: v.visit_date, slot: v.slot as CanonicalSlot });
    visitsByJob.set(v.job_id, list);
  }

  const assignedJobs: CleanerProJobSummary[] = activeJobs.map((job) => {
    const team = teamByJob.get(job.id) ?? [];
    const splits = splitCleanerPool(Number(job.cleaner_pool_per_clean_naira || 0), team.length);
    const myIdx = team.findIndex((t) => t.cleaner_id === cleanerId);
    const myShare = myIdx >= 0 ? splits[myIdx]?.amountNaira ?? 0 : splits[0]?.amountNaira ?? 0;
    const partner = team.find((t) => t.cleaner_id !== cleanerId);
    const addressUnlocked = unlockedByJob.has(job.id);

    return {
      job_id: job.id,
      invoice_number: job.invoice_number,
      status: job.status as JobStatus,
      service_name: job.service_name,
      property_bedrooms: Number(job.property_bedrooms || 1),
      billing: job.billing,
      frequency: job.frequency ?? null,
      client_name: job.client_name ?? null,
      client_address: addressUnlocked ? (job.client_address ?? null) : null,
      client_area: job.client_area ?? null,
      address_unlocked: addressUnlocked,
      your_cut_per_clean_naira: myShare,
      co_cleaner_name: partner?.full_name ?? null,
      upcoming_visits: visitsByJob.get(job.id) ?? [],
    };
  });

  return {
    schemaReady: true,
    nextVisit: upcomingVisits[0] ?? null,
    upcomingVisits,
    assignedJobs,
  };
}
