/**
 * PayoutService — manages Cleanse Pro bank accounts, 70% earned clean ledger
 * visibility (invoice visits + online bookings), and atomic monthly payout
 * settlements ("Confirm Paid") that lock settled rows to prevent double payments.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import { payoutConfig } from "@/config";
import type { AdminContext } from "@/auth/admin";
import { lagosTodayIso } from "@/domain/invoice/schedule";
import { isMissingJobSchemaError } from "@/domain/job/invoice-job-service";
import { splitCleanerPool } from "@/domain/job/pricing";
import type { CleanerBankAccountInput, SettlePayoutInput } from "@/validation/schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CleanerBankAccount {
  cleaner_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  updated_at: string;
}

export interface UnpaidEarningItem {
  id: string;
  source_type: "INVOICE_VISIT" | "BOOKING_JOB";
  job_label: string;
  earned_on: string;
  gross_clean_naira: number;
  supplies_deducted_naira: number;
  net_pool_naira: number;
  share_bps: number;
  amount_naira: number;
}

export interface PayoutReceipt {
  id: string;
  period_key: string;
  cutoff_date: string;
  total_amount_naira: number;
  earning_count: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  reference_note: string | null;
  settled_at: string;
}

export interface MonthBucket {
  month_key: string; // YYYY-MM
  total_naira: number;
  visit_count: number;
}

export interface CleanerEarningsSummary {
  schemaReady: boolean;
  bankAccount: CleanerBankAccount | null;
  unpaidTotalNaira: number;
  unpaidCount: number;
  unpaidByMonth: MonthBucket[];
  unpaidEarnings: UnpaidEarningItem[];
  paidTotalAllTimeNaira: number;
  payouts: PayoutReceipt[];
  todayIso: string;
}

function summarizeMonths(rows: Array<{ earned_on: string; amount_naira: number }>): MonthBucket[] {
  const byMonth = new Map<string, MonthBucket>();
  for (const r of rows) {
    const monthKey = String(r.earned_on || "").slice(0, 7);
    if (!monthKey) continue;
    const prev = byMonth.get(monthKey) ?? { month_key: monthKey, total_naira: 0, visit_count: 0 };
    prev.total_naira += Number(r.amount_naira || 0);
    prev.visit_count += 1;
    byMonth.set(monthKey, prev);
  }
  return Array.from(byMonth.values()).sort((a, b) => b.month_key.localeCompare(a.month_key));
}

export async function getCleanerBankAccount(cleanerId: string): Promise<{
  schemaReady: boolean;
  bankAccount: CleanerBankAccount | null;
}> {
  if (!UUID.test(cleanerId)) throw new AppError("CLEANER_NOT_FOUND", "Cleaner not found.");
  const { data, error } = await serviceClient()
    .from("cleaner_bank_accounts")
    .select("cleaner_id, bank_name, account_number, account_name, updated_at")
    .eq("cleaner_id", cleanerId)
    .maybeSingle();

  if (error) {
    if (isMissingJobSchemaError(error)) return { schemaReady: false, bankAccount: null };
    throw new AppError("INTERNAL_ERROR", "Could not load bank details.");
  }
  return { schemaReady: true, bankAccount: (data as CleanerBankAccount | null) ?? null };
}

export async function upsertCleanerBankAccount(
  cleanerId: string,
  input: CleanerBankAccountInput
): Promise<CleanerBankAccount> {
  if (!UUID.test(cleanerId)) throw new AppError("CLEANER_NOT_FOUND", "Cleaner not found.");
  const nowIso = new Date().toISOString();
  const { data, error } = await serviceClient()
    .from("cleaner_bank_accounts")
    .upsert(
      {
        cleaner_id: cleanerId,
        bank_name: input.bank_name.trim(),
        account_number: input.account_number.trim(),
        account_name: input.account_name.trim(),
        updated_at: nowIso,
      },
      { onConflict: "cleaner_id" }
    )
    .select("cleaner_id, bank_name, account_number, account_name, updated_at")
    .single();

  if (error) {
    if (isMissingJobSchemaError(error)) {
      throw new AppError("INTERNAL_ERROR", "Run migration 0015_jobs_and_payouts.sql first.");
    }
    throw new AppError("INTERNAL_ERROR", "Could not save bank account details.");
  }
  return data as CleanerBankAccount;
}

export async function getCleanerEarningsSummary(cleanerId: string): Promise<CleanerEarningsSummary> {
  if (!UUID.test(cleanerId)) throw new AppError("CLEANER_NOT_FOUND", "Cleaner not found.");
  const db = serviceClient();
  const todayIso = lagosTodayIso();

  const [bankRes, unpaidRes, payoutsRes] = await Promise.all([
    db
      .from("cleaner_bank_accounts")
      .select("cleaner_id, bank_name, account_number, account_name, updated_at")
      .eq("cleaner_id", cleanerId)
      .maybeSingle(),
    db
      .from("cleaner_visit_earnings")
      .select(
        "id, source_type, job_label, earned_on, gross_clean_naira, supplies_deducted_naira, net_pool_naira, share_bps, amount_naira"
      )
      .eq("cleaner_id", cleanerId)
      .is("payout_id", null)
      .order("earned_on", { ascending: false }),
    db
      .from("cleaner_payouts")
      .select(
        "id, period_key, cutoff_date, total_amount_naira, earning_count, bank_name, account_number, account_name, reference_note, settled_at"
      )
      .eq("cleaner_id", cleanerId)
      .order("settled_at", { ascending: false })
      .limit(50),
  ]);

  if (isMissingJobSchemaError(bankRes.error) || isMissingJobSchemaError(unpaidRes.error)) {
    return {
      schemaReady: false,
      bankAccount: null,
      unpaidTotalNaira: 0,
      unpaidCount: 0,
      unpaidByMonth: [],
      unpaidEarnings: [],
      paidTotalAllTimeNaira: 0,
      payouts: [],
      todayIso,
    };
  }

  const unpaidEarnings = ((unpaidRes.data ?? []) as Array<Record<string, any>>).map((r) => ({
    id: r.id,
    source_type: r.source_type as "INVOICE_VISIT" | "BOOKING_JOB",
    job_label: r.job_label,
    earned_on: r.earned_on,
    gross_clean_naira: Number(r.gross_clean_naira || 0),
    supplies_deducted_naira: Number(r.supplies_deducted_naira || 0),
    net_pool_naira: Number(r.net_pool_naira || 0),
    share_bps: Number(r.share_bps || 10000),
    amount_naira: Number(r.amount_naira || 0),
  }));

  const payouts = ((payoutsRes.data ?? []) as Array<Record<string, any>>).map((p) => ({
    id: p.id,
    period_key: p.period_key,
    cutoff_date: p.cutoff_date,
    total_amount_naira: Number(p.total_amount_naira || 0),
    earning_count: Number(p.earning_count || 0),
    bank_name: p.bank_name,
    account_number: p.account_number,
    account_name: p.account_name,
    reference_note: p.reference_note ?? null,
    settled_at: p.settled_at,
  }));

  const unpaidTotalNaira = unpaidEarnings.reduce((sum, e) => sum + e.amount_naira, 0);
  const paidTotalAllTimeNaira = payouts.reduce((sum, p) => sum + p.total_amount_naira, 0);

  return {
    schemaReady: true,
    bankAccount: (bankRes.data as CleanerBankAccount | null) ?? null,
    unpaidTotalNaira,
    unpaidCount: unpaidEarnings.length,
    unpaidByMonth: summarizeMonths(unpaidEarnings),
    unpaidEarnings,
    paidTotalAllTimeNaira,
    payouts,
    todayIso,
  };
}

export interface OperatorCleanerPayoutRow {
  cleaner_id: string;
  cleaner_code: string;
  full_name: string;
  account_status: string;
  bank_account: CleanerBankAccount | null;
  unpaid_total_naira: number;
  unpaid_count: number;
  unpaid_by_month: MonthBucket[];
  last_payout: PayoutReceipt | null;
}

export async function listOperatorPayoutsOverview(): Promise<{
  schemaReady: boolean;
  todayIso: string;
  cleaners: OperatorCleanerPayoutRow[];
  recentPayouts: Array<PayoutReceipt & { cleaner_id: string; cleaner_name: string; cleaner_code: string }>;
}> {
  const db = serviceClient();
  const todayIso = lagosTodayIso();

  const [cleanersRes, banksRes, unpaidRes, payoutsRes] = await Promise.all([
    db
      .from("cleaners")
      .select("id, cleaner_code, full_name, account_status")
      .in("account_status", ["ACTIVE", "ONBOARDING", "PAUSED", "SUSPENDED"])
      .order("full_name", { ascending: true }),
    db.from("cleaner_bank_accounts").select("cleaner_id, bank_name, account_number, account_name, updated_at"),
    db
      .from("cleaner_visit_earnings")
      .select("cleaner_id, earned_on, amount_naira")
      .is("payout_id", null),
    db
      .from("cleaner_payouts")
      .select(
        "id, cleaner_id, period_key, cutoff_date, total_amount_naira, earning_count, bank_name, account_number, account_name, reference_note, settled_at"
      )
      .order("settled_at", { ascending: false })
      .limit(100),
  ]);

  if (isMissingJobSchemaError(banksRes.error) || isMissingJobSchemaError(unpaidRes.error)) {
    return { schemaReady: false, todayIso, cleaners: [], recentPayouts: [] };
  }

  const cleanersList = (cleanersRes.data ?? []) as Array<{
    id: string;
    cleaner_code: string;
    full_name: string;
    account_status: string;
  }>;
  const cleanerMeta = new Map(cleanersList.map((c) => [c.id, c]));

  const bankByCleaner = new Map<string, CleanerBankAccount>();
  for (const b of (banksRes.data ?? []) as CleanerBankAccount[]) {
    bankByCleaner.set(b.cleaner_id, b);
  }

  const unpaidByCleaner = new Map<string, Array<{ earned_on: string; amount_naira: number }>>();
  for (const e of (unpaidRes.data ?? []) as Array<{ cleaner_id: string; earned_on: string; amount_naira: number }>) {
    const arr = unpaidByCleaner.get(e.cleaner_id) ?? [];
    arr.push({ earned_on: e.earned_on, amount_naira: Number(e.amount_naira || 0) });
    unpaidByCleaner.set(e.cleaner_id, arr);
  }

  const lastPayoutByCleaner = new Map<string, PayoutReceipt>();
  const recentPayouts: Array<
    PayoutReceipt & { cleaner_id: string; cleaner_name: string; cleaner_code: string }
  > = [];

  for (const p of (payoutsRes.data ?? []) as Array<Record<string, any>>) {
    const receipt: PayoutReceipt = {
      id: p.id,
      period_key: p.period_key,
      cutoff_date: p.cutoff_date,
      total_amount_naira: Number(p.total_amount_naira || 0),
      earning_count: Number(p.earning_count || 0),
      bank_name: p.bank_name,
      account_number: p.account_number,
      account_name: p.account_name,
      reference_note: p.reference_note ?? null,
      settled_at: p.settled_at,
    };
    if (!lastPayoutByCleaner.has(p.cleaner_id)) {
      lastPayoutByCleaner.set(p.cleaner_id, receipt);
    }
    const meta = cleanerMeta.get(p.cleaner_id);
    recentPayouts.push({
      ...receipt,
      cleaner_id: p.cleaner_id,
      cleaner_name: meta?.full_name ?? "Cleanse Pro",
      cleaner_code: meta?.cleaner_code ?? "",
    });
  }

  const rows: OperatorCleanerPayoutRow[] = cleanersList
    .map((c) => {
      const unpaidRows = unpaidByCleaner.get(c.id) ?? [];
      const unpaidTotal = unpaidRows.reduce((s, r) => s + r.amount_naira, 0);
      return {
        cleaner_id: c.id,
        cleaner_code: c.cleaner_code,
        full_name: c.full_name,
        account_status: c.account_status,
        bank_account: bankByCleaner.get(c.id) ?? null,
        unpaid_total_naira: unpaidTotal,
        unpaid_count: unpaidRows.length,
        unpaid_by_month: summarizeMonths(unpaidRows),
        last_payout: lastPayoutByCleaner.get(c.id) ?? null,
      };
    })
    .sort((a, b) => b.unpaid_total_naira - a.unpaid_total_naira || a.full_name.localeCompare(b.full_name));

  return { schemaReady: true, todayIso, cleaners: rows, recentPayouts };
}

/**
 * Atomically marks a Cleanse Pro's unpaid served visits through `cutoff_date` as PAID,
 * locking them onto an immutable `cleaner_payouts` receipt so they can never be paid twice.
 */
export async function settleCleanerPayout(
  cleanerId: string,
  admin: AdminContext,
  input: SettlePayoutInput
) {
  if (!UUID.test(cleanerId)) throw new AppError("CLEANER_NOT_FOUND", "Cleaner not found.");
  const db = serviceClient();

  const { data, error } = await db.rpc("settle_cleaner_payout", {
    p_cleaner_id: cleanerId,
    p_admin_id: admin.adminId,
    p_period_key: input.period_key,
    p_cutoff_date: input.cutoff_date,
    p_idempotency_key: input.idempotency_key,
    p_reference_note: input.reference_note ?? null,
  });

  if (error) {
    const msg = error.message ?? "";
    if (/NOTHING_TO_PAY/i.test(msg)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "No unpaid served cleans up to that cut-off date. Already settled!"
      );
    }
    if (/BANK_ACCOUNT_MISSING/i.test(msg)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "This Cleanse Pro has not saved their bank account details in /pro yet."
      );
    }
    if (/CLEANER_NOT_FOUND/i.test(msg)) {
      throw new AppError("CLEANER_NOT_FOUND", "Cleanse Pro not found.");
    }
    if (isMissingJobSchemaError(error)) {
      throw new AppError("INTERNAL_ERROR", "Run migration 0015_jobs_and_payouts.sql first.");
    }
    throw new AppError("INTERNAL_ERROR", "Could not confirm payout.");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new AppError("INTERNAL_ERROR", "Payout confirmation returned empty result.");

  if (!row.already_settled) {
    await db.from("audit_logs").insert({
      actor_auth_user_id: admin.authUserId,
      action: "cleaner.payout_settled",
      entity_type: "cleaner",
      entity_id: cleanerId,
      after_data: {
        payout_id: row.payout_id,
        period_key: row.period_key,
        cutoff_date: row.cutoff_date,
        total_amount_naira: Number(row.total_amount_naira),
        earning_count: row.earning_count,
      },
    });
  }

  return row;
}

/**
 * Records a completed online `/book` assignment into the shared 70% earnings ledger
 * so both recurring invoice visits and online bookings settle through one monthly balance.
 */
export async function recordBookingJobEarning(bookingId: string, cleanerId: string): Promise<void> {
  const db = serviceClient();
  const { data: booking } = await db
    .from("bookings")
    .select(
      "id, public_reference, scheduled_start_at, total_kobo, requested_cleaner_count, property_bedrooms, service:services(name)"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return;
  const b = booking as Record<string, any>;
  const totalNaira = Math.round(Number(b.total_kobo || 0) / 100);
  const netPool = Math.round((totalNaira * payoutConfig.cleanerPayoutBps) / 10000);
  const teamCount = Math.max(1, Math.min(2, Number(b.requested_cleaner_count || 1)));
  const splits = splitCleanerPool(netPool, teamCount);
  const share = splits[0] ?? { shareBps: 10000, amountNaira: netPool };
  const earnedOn = b.scheduled_start_at
    ? lagosTodayIso(new Date(b.scheduled_start_at))
    : lagosTodayIso();
  const jobLabel = `${b.public_reference} · ${b.service?.name ?? "Online Booking"}${
    b.property_bedrooms ? ` (${b.property_bedrooms}BR)` : ""
  }`;

  const { error } = await db
    .from("cleaner_visit_earnings")
    .upsert(
      {
        source_type: "BOOKING_JOB",
        invoice_visit_id: null,
        booking_id: bookingId,
        cleaner_id: cleanerId,
        job_label: jobLabel,
        earned_on: earnedOn,
        gross_clean_naira: totalNaira,
        supplies_deducted_naira: 0,
        net_pool_naira: netPool,
        share_bps: share.shareBps,
        amount_naira: share.amountNaira,
        payout_id: null,
      },
      { onConflict: "booking_id,cleaner_id", ignoreDuplicates: true }
    );

  if (error && !isMissingJobSchemaError(error)) {
    // Non-fatal: online booking completion still succeeds even if ledger write hits an unexpected conflict.
    console.warn("recordBookingJobEarning.warn", error.message);
  }
}

