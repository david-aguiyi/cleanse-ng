/**
 * OnboardingService — candidate intake, identity verification (NIN & Photo),
 * 19-clause Cleanse Pro Agreement storage, and operator conversion to Cleaner profile.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import { createCleaner } from "./cleaner-service";
import type { AdminContext } from "@/auth/admin";
import type { CleanerOnboardingInput, UpdateOnboardingReviewInput } from "@/validation/schemas";

export interface OnboardingListFilters {
  status?: string;
  search?: string;
  limit?: number;
}

export async function submitOnboarding(
  input: CleanerOnboardingInput,
  meta: { ip?: string; userAgent?: string } = {}
) {
  const db = serviceClient();

  // Validate NIN format
  const ninDigits = input.nin_digits.replace(/\D/g, "");
  if (ninDigits.length !== 11) {
    throw new AppError("INVALID_NIN", "NIN must be exactly 11 digits.");
  }

  const { data, error } = await db
    .from("cleaner_onboardings")
    .insert({
      applicant_id: input.applicant_id || null,
      status: "SUBMITTED",

      // 1. About You
      full_name: input.full_name,
      photo_url: input.photo_url,
      whatsapp_e164: input.whatsapp,
      date_of_birth: input.date_of_birth,
      gender: input.gender,
      nin_digits: ninDigits,
      nin_document_url: input.nin_document_url,

      // 2. Where You Live (Split Address)
      street_address: input.street_address,
      landmark: input.landmark,
      neighbourhood: input.neighbourhood,
      lga: input.lga,
      city_state: input.city_state || "Ibadan, Oyo State",
      directions: input.directions || null,
      closest_zone: input.closest_zone,
      transport_mode: input.transport_mode,
      travel_time_hub: input.travel_time_hub,

      // 3. Background
      education_level: input.education_level,
      religion: input.religion || null,
      languages: input.languages,
      experience_details: input.experience_details || null,
      products_used: input.products_used,
      equipment_used: input.equipment_used,

      // 4. Availability
      available_days: input.available_days,
      early_morning_ok: input.early_morning_ok,
      pair_work_ok: input.pair_work_ok,
      start_readiness: input.start_readiness,

      // 5. Trust & Safety
      guarantor_name: input.guarantor_name,
      guarantor_phone: input.guarantor_phone,
      guarantor_relationship: input.guarantor_relationship,
      guarantor_occupation: input.guarantor_occupation || null,
      emergency_name: input.emergency_name,
      emergency_phone: input.emergency_phone,
      emergency_relationship: input.emergency_relationship,
      allergies: input.allergies || null,

      // 6. Cleanse Fit
      why_cleanse: input.why_cleanse || null,
      one_year_goal: input.one_year_goal || null,
      accidental_breakage_response: input.accidental_breakage_response || null,
      referral_source: input.referral_source || null,

      // 7. Agreement (19 Clauses)
      agreement_version: input.agreement_version || "v1.0",
      agreed_clauses: input.agreed_clauses,
      agreed_at: new Date().toISOString(),
      source_ip: meta.ip || null,
      user_agent: meta.userAgent || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL_ERROR", error?.message ?? "Could not submit your onboarding details.");
  }

  // If linked to an applicant record, add an operator note
  if (input.applicant_id) {
    try {
      await db
        .from("cleaner_applications")
        .update({
          admin_notes: `Candidate submitted Cleanse Pro Onboarding Form (Record: ${data.id}) on ${new Date().toISOString()}`,
        })
        .eq("id", input.applicant_id);
    } catch {
      // non-fatal if applicant link cannot be updated
    }
  }

  return { id: data.id as string };
}

export async function listOnboardings(filters: OnboardingListFilters = {}) {
  const db = serviceClient();
  let query = db
    .from("cleaner_onboardings")
    .select(
      "id, created_at, status, full_name, whatsapp_e164, closest_zone, nin_digits, nin_verified, guarantor_called, photo_url, applicant_id, cleaner_id"
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(filters.limit ?? 100, 200));

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) {
    const term = filters.search.trim().replace(/[,()%*]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,whatsapp_e164.ilike.%${term}%,nin_digits.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load onboarding records.");
  return data ?? [];
}

export async function getOnboarding(id: string) {
  const db = serviceClient();
  const { data, error } = await db
    .from("cleaner_onboardings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) throw new AppError("ONBOARDING_NOT_FOUND", "Onboarding record not found.");
  return data;
}

export async function getOnboardingByApplicant(applicantId: string) {
  const db = serviceClient();
  const { data } = await db
    .from("cleaner_onboardings")
    .select("id, status, created_at, cleaner_id")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function updateOnboardingReview(
  id: string,
  patch: UpdateOnboardingReviewInput,
  admin: AdminContext
) {
  const db = serviceClient();
  const update: Record<string, unknown> = {
    reviewed_by: admin.adminId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (patch.status !== undefined) update.status = patch.status;
  if (patch.nin_verified !== undefined) update.nin_verified = patch.nin_verified;
  if (patch.guarantor_called !== undefined) update.guarantor_called = patch.guarantor_called;
  if (patch.admin_notes !== undefined) update.admin_notes = patch.admin_notes;

  const { data, error } = await db
    .from("cleaner_onboardings")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) throw new AppError("INTERNAL_ERROR", "Could not update review.");
  return data;
}

export async function approveAndCreateCleaner(
  onboardingId: string,
  cleanerParams: {
    email: string;
    password?: string;
    zone_codes?: string[];
    service_codes?: string[];
  },
  admin: AdminContext
) {
  const onboarding = await getOnboarding(onboardingId);
  const db = serviceClient();

  // If already linked to a cleaner profile
  if (onboarding.cleaner_id) {
    return { cleaner_id: onboarding.cleaner_id, already_created: true };
  }

  // Temporary password if not supplied
  const tempPassword = cleanerParams.password || `Cleanse#${Math.random().toString(36).slice(-6)}!`;

  // Create cleaner account via CleanerService
  const cleaner = await createCleaner(
    {
      full_name: onboarding.full_name,
      email: cleanerParams.email,
      password: tempPassword,
      phone_e164: onboarding.whatsapp_e164,
      whatsapp_e164: onboarding.whatsapp_e164,
      bio: `Cleanse Pro (NIN verified: ${onboarding.nin_verified ? "YES" : "PENDING"}). Closest: ${onboarding.closest_zone}.`,
      work_rate_label: "TRAINEE",
      zone_codes: cleanerParams.zone_codes || [],
      service_codes: cleanerParams.service_codes || ["REGULAR"],
    },
    admin
  );

  // Update photo_path and link in cleaners table
  await db
    .from("cleaners")
    .update({ photo_path: onboarding.photo_url })
    .eq("id", cleaner.id);

  // Link onboarding record to cleaner
  await db
    .from("cleaner_onboardings")
    .update({
      cleaner_id: cleaner.id,
      status: "APPROVED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", onboardingId);

  // Mark applicant as HIRED if linked
  if (onboarding.applicant_id) {
    try {
      await db
        .from("cleaner_applications")
        .update({ status: "HIRED" })
        .eq("id", onboarding.applicant_id);
    } catch {
      // non-fatal if applicant record was cleared
    }
  }

  return { cleaner_id: cleaner.id, cleaner_code: cleaner.cleaner_code };
}

export async function deleteOnboarding(id: string) {
  const { error } = await serviceClient()
    .from("cleaner_onboardings")
    .delete()
    .eq("id", id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete onboarding record.");
  return { deleted: true };
}
