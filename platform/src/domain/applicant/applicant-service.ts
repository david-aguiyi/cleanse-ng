/**
 * ApplicantService — public "Become a Cleanse Pro" applications and the
 * operator review queue. Applicants are not cleaners: hiring one still goes
 * through /admin/cleaners/new.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import type { AdminContext } from "@/auth/admin";
import type { CleanerApplicationInput, UpdateApplicationInput } from "@/validation/schemas";

export async function submitApplication(input: CleanerApplicationInput, sourceIp: string) {
  const { consent: _consent, website: _website, whatsapp, address, ...answers } = input;
  const { data, error } = await serviceClient()
    .from("cleaner_applications")
    .insert({
      ...answers,
      whatsapp_e164: whatsapp,
      // The "area" column holds the free-text home address applicants type in.
      area: address,
      landmark: answers.landmark || null,
      heard_from: answers.heard_from || null,
      consent_at: new Date().toISOString(),
      source_ip: sourceIp,
    })
    .select("id")
    .single();
  if (error || !data) throw new AppError("INTERNAL_ERROR", "Could not save your application.");
  return { id: data.id as string };
}

export interface ApplicationListFilters {
  status?: string;
  search?: string;
  limit?: number;
}

export async function listApplications(filters: ApplicationListFilters) {
  let query = serviceClient()
    .from("cleaner_applications")
    .select("id, created_at, status, full_name, whatsapp_e164, date_of_birth, gender, area, experience, available_days")
    .order("created_at", { ascending: false })
    .limit(Math.min(filters.limit ?? 200, 500));

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) {
    // Match name or address; strip characters that would break the or() filter.
    const term = filters.search.trim().replace(/[,()%*]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,area.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load applications.");
  return data ?? [];
}

export async function getApplication(id: string) {
  const { data } = await serviceClient()
    .from("cleaner_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) throw new AppError("APPLICATION_NOT_FOUND", "Application not found.");
  return data;
}

/** Change status and/or append a timestamped note (notes are append-only). */
export async function updateApplication(id: string, patch: UpdateApplicationInput, admin: AdminContext) {
  const current = await getApplication(id);
  const update: Record<string, unknown> = {
    reviewed_by: admin.adminId,
    reviewed_at: new Date().toISOString(),
  };
  if (patch.status) update.status = patch.status;
  if (patch.note) {
    const stamp = new Date().toLocaleString("en-GB", { timeZone: "Africa/Lagos" });
    const line = `[${stamp} · ${admin.fullName}] ${patch.note}`;
    update.admin_notes = current.admin_notes ? `${current.admin_notes}\n${line}` : line;
  }
  const { data, error } = await serviceClient()
    .from("cleaner_applications")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new AppError("INTERNAL_ERROR", "Could not update the application.");
  return data;
}

/** Delete a single application by id (operator action). */
export async function deleteApplication(id: string) {
  const { error } = await serviceClient()
    .from("cleaner_applications")
    .delete()
    .eq("id", id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete application.");
  return { deleted: true };
}

/** Clear applications (purge all or purge by status for fresh testing/batches). */
export async function clearApplications(options?: { status?: string }) {
  let query = serviceClient().from("cleaner_applications").delete();
  if (options?.status) {
    query = query.eq("status", options.status);
  } else {
    // Delete all rows in the table
    query = query.neq("id", "00000000-0000-0000-0000-000000000000");
  }
  const { error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not clear applications.");
  return { cleared: true };
}

/** Whole years between a YYYY-MM-DD birth date and today. */
export function ageFromDob(dob: string): number {
  const b = new Date(dob + "T00:00:00Z");
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age -= 1;
  return age;
}
