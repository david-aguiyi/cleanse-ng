/**
 * InvoiceService — invoices saved from the admin invoice maker. The form state
 * is stored whole in `data`; the number is assigned by Postgres on first save
 * (next_invoice_number(), migration 0011) and never changes afterwards.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import type { AdminContext } from "@/auth/admin";
import type { InvoiceSaveInput } from "@/validation/schemas";
import {
  expandInvoiceVisits,
  lagosMonthStartIso,
  normalizeSlot,
  toLagosDateAndSlot,
  type CanonicalSlot,
} from "./schedule";
import {
  isMissingJobSchemaError,
  syncJobFromInvoice,
} from "@/domain/job/invoice-job-service";
import { isJobActiveForCalendar } from "@/domain/job/pricing";

type InvoiceData = InvoiceSaveInput["data"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same rule as the maker's parseAmt(): digits and dot only, leading minus kept. */
function amount(v: unknown): number {
  const s = String(v ?? "");
  const n = parseFloat(s.replace(/[^\d.]/g, ""));
  if (isNaN(n)) return 0;
  return /^\s*-/.test(s) ? -n : n;
}

function summarise(data: InvoiceData) {
  // The number lives in its own column; never trust one sent from the browser.
  const { num: _num, ...rest } = data as InvoiceData & { num?: unknown };
  return {
    data: rest,
    client_name: data.client.trim() || null,
    client_address: data.addr.trim() || null,
    total_naira: Math.round(data.items.reduce((sum, it) => sum + amount(it.a), 0)),
  };
}

export async function createInvoice(data: InvoiceData, admin: AdminContext, customNum?: string) {
  const summary = summarise(data);
  const insertPayload: Record<string, unknown> = {
    ...summary,
    created_by: admin.adminId,
    updated_by: admin.adminId,
  };
  if (customNum && customNum.trim()) {
    insertPayload.invoice_number = customNum.trim().toUpperCase();
  }
  const { data: row, error } = await serviceClient()
    .from("invoices")
    .insert(insertPayload)
    .select("id, invoice_number")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new AppError("VALIDATION_ERROR", `Invoice number "${customNum}" already exists.`, 400);
    }
    throw new AppError("INTERNAL_ERROR", "Could not save the invoice.");
  }
  if (!row) throw new AppError("INTERNAL_ERROR", "Could not save the invoice.");
  const synced = await syncJobFromInvoice(
    { id: row.id, invoice_number: row.invoice_number, total_naira: summary.total_naira },
    summary.data as Record<string, unknown>,
    admin
  );
  return { ...(row as { id: string; invoice_number: string }), job_id: synced.jobId ?? null };
}

export async function updateInvoice(id: string, data: InvoiceData, admin: AdminContext, customNum?: string) {
  if (!UUID.test(id)) throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.");
  const summary = summarise(data);
  const updatePayload: Record<string, unknown> = {
    ...summary,
    updated_by: admin.adminId,
    updated_at: new Date().toISOString(),
  };
  if (customNum && customNum.trim()) {
    updatePayload.invoice_number = customNum.trim().toUpperCase();
  }
  const { data: row, error } = await serviceClient()
    .from("invoices")
    .update(updatePayload)
    .eq("id", id)
    .select("id, invoice_number")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      throw new AppError("VALIDATION_ERROR", `Invoice number "${customNum}" already exists.`, 400);
    }
    throw new AppError("INTERNAL_ERROR", "Could not save the invoice.");
  }
  if (!row) throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.");
  const synced = await syncJobFromInvoice(
    { id: row.id, invoice_number: row.invoice_number, total_naira: summary.total_naira },
    summary.data as Record<string, unknown>,
    admin
  );
  return { ...(row as { id: string; invoice_number: string }), job_id: synced.jobId ?? null };
}

export async function getInvoice(id: string) {
  if (!UUID.test(id)) throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.");
  const { data } = await serviceClient()
    .from("invoices")
    .select("id, invoice_number, created_at, updated_at, client_name, client_address, total_naira, data")
    .eq("id", id)
    .maybeSingle();
  if (!data) throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.");
  return data;
}

/** Settings a new invoice inherits from the most recently saved one. */
const CARRIED_OVER = ["accName", "bank", "accNo", "dep", "mat", "equip"] as const;

export async function latestInvoiceDefaults(): Promise<Record<string, unknown>> {
  const { data } = await serviceClient()
    .from("invoices")
    .select("data")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const last = (data?.data ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of CARRIED_OVER) if (last[k] !== undefined && last[k] !== "") out[k] = last[k];
  return out;
}

export async function listInvoices(search?: string) {
  let query = serviceClient()
    .from("invoices")
    .select("id, invoice_number, created_at, updated_at, client_name, client_address, total_naira, data, creator:admin_users!invoices_created_by_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (search && search.trim()) {
    const term = search.trim().replace(/[,()%*]/g, " ");
    query = query.or(`invoice_number.ilike.%${term}%,client_name.ilike.%${term}%,client_address.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load invoices.");
  return data ?? [];
}

export async function deleteInvoice(id: string) {
  if (!UUID.test(id)) throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.");
  const { data, error } = await serviceClient()
    .from("invoices")
    .delete()
    .eq("id", id)
    .select("id, invoice_number")
    .maybeSingle();
  if (error) {
    if (error.code === "23503") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Cannot delete an invoice that has served or paid visits. Mark the job Ended or Terminated instead.",
        400
      );
    }
    throw new AppError("INTERNAL_ERROR", "Could not delete the invoice.");
  }
  if (!data) throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.");
  return data as { id: string; invoice_number: string };
}

/**
 * Aggregates anonymized date -> canonical slot entries from active saved invoices
 * and confirmed paid online bookings for the public booking calendar & slot pills.
 * Returns zero PII: strictly { "YYYY-MM-DD": ["8am - 11am", ...] }.
 */
export async function listPublicBookedSlots(options?: {
  excludeInvoiceId?: string | null;
}): Promise<{ slots: Record<string, CanonicalSlot[]>; generatedAt: string }> {
  const db = serviceClient();
  const minDate = lagosMonthStartIso();
  const excludeId =
    options?.excludeInvoiceId && UUID.test(options.excludeInvoiceId)
      ? options.excludeInvoiceId
      : null;

  const [invRes, bookRes, jobsRes, visitsRes] = await Promise.all([
    db
      .from("invoices")
      .select("id, data")
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("bookings")
      .select("scheduled_start_at")
      .eq("payment_status", "SUCCESS")
      .is("cancelled_at", null)
      .neq("customer_status", "CANCELLED")
      .neq("fulfilment_status", "CANCELLED")
      .gte("scheduled_start_at", `${minDate}T00:00:00+01:00`)
      .limit(500),
    db
      .from("invoice_jobs")
      .select("id, invoice_id, status, reserve_calendar")
      .limit(500),
    db
      .from("invoice_job_visits")
      .select("job_id, visit_date, slot, status")
      .gte("visit_date", minDate)
      .in("status", ["SCHEDULED", "SERVED"])
      .limit(5000),
  ]);

  if (invRes.error) {
    throw new AppError("INTERNAL_ERROR", "Could not load calendar availability.");
  }

  const slots: Record<string, CanonicalSlot[]> = {};
  const add = (date: string, slot: CanonicalSlot) => {
    if (date < minDate) return;
    if (!slots[date]) slots[date] = [];
    slots[date].push(slot);
  };

  const hasJobSchema =
    !jobsRes.error &&
    !visitsRes.error &&
    !isMissingJobSchemaError(jobsRes.error) &&
    !isMissingJobSchemaError(visitsRes.error);

  const jobByInvoiceId = new Map<
    string,
    { id: string; status: string; reserve_calendar: boolean }
  >();
  const visitsByJobId = new Map<string, Array<{ visit_date: string; slot: string }>>();

  if (hasJobSchema) {
    for (const j of (jobsRes.data ?? []) as Array<{
      id: string;
      invoice_id: string;
      status: string;
      reserve_calendar: boolean;
    }>) {
      jobByInvoiceId.set(j.invoice_id, j);
    }
    for (const v of (visitsRes.data ?? []) as Array<{
      job_id: string;
      visit_date: string;
      slot: string;
    }>) {
      const list = visitsByJobId.get(v.job_id) ?? [];
      list.push(v);
      visitsByJobId.set(v.job_id, list);
    }
  }

  for (const row of invRes.data ?? []) {
    if (excludeId && row.id === excludeId) continue;

    if (hasJobSchema) {
      const job = jobByInvoiceId.get(row.id);
      if (job) {
        // PENDING, PAUSED, ENDED, and TERMINATED jobs never reserve calendar slots.
        if (!isJobActiveForCalendar(job.status, job.reserve_calendar)) continue;
        for (const v of visitsByJobId.get(job.id) ?? []) {
          const s = normalizeSlot(v.slot);
          if (s) add(v.visit_date, s);
        }
        continue;
      }
    }

    const rawData = row.data as Record<string, unknown> | null;
    const rawStatus = typeof rawData?.jobStatus === "string" ? rawData.jobStatus : "ACTIVE";
    if (rawStatus !== "ACTIVE") continue;

    const visits = expandInvoiceVisits(rawData);
    for (const v of visits) {
      add(v.date, v.slot);
    }
  }

  if (!bookRes.error && bookRes.data) {
    for (const b of bookRes.data) {
      if (!b.scheduled_start_at) continue;
      const mapped = toLagosDateAndSlot(String(b.scheduled_start_at));
      if (mapped) add(mapped.date, mapped.slot);
    }
  }

  return {
    slots,
    generatedAt: new Date().toISOString(),
  };
}
