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

export async function createInvoice(data: InvoiceData, admin: AdminContext) {
  const { data: row, error } = await serviceClient()
    .from("invoices")
    .insert({ ...summarise(data), created_by: admin.adminId, updated_by: admin.adminId })
    .select("id, invoice_number")
    .single();
  if (error || !row) throw new AppError("INTERNAL_ERROR", "Could not save the invoice.");
  return row as { id: string; invoice_number: string };
}

export async function updateInvoice(id: string, data: InvoiceData, admin: AdminContext) {
  if (!UUID.test(id)) throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.");
  const { data: row, error } = await serviceClient()
    .from("invoices")
    .update({ ...summarise(data), updated_by: admin.adminId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, invoice_number")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not save the invoice.");
  if (!row) throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.");
  return row as { id: string; invoice_number: string };
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
    .select("id, invoice_number, created_at, updated_at, client_name, client_address, total_naira, creator:admin_users!invoices_created_by_fkey(full_name)")
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
