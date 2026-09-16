/**
 * CleanerService — profile, availability, qualification and admin management
 * (Blueprint §2.2, §9.1, §11.2, §11.3).
 *
 * Key invariant (Stage 4 exit criterion): only an ACTIVE + verified +
 * deployment-ready cleaner may set themselves AVAILABLE. This is the single
 * gate that lets a cleaner enter the dispatch pool.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import { newCleanerCode } from "@/domain/booking/reference";
import { isDeploymentReady } from "./readiness";
import type { AdminContext } from "@/auth/admin";
import type { CreateCleanerInput, UpdateCleanerInput } from "@/validation/schemas";

export { isDeploymentReady };

const READINESS_FIELDS = "account_status, verified, deployment_ready";

// --------------------------------------------------------------------------
// Cleaner self-service
// --------------------------------------------------------------------------
export async function getMe(cleanerId: string) {
  const db = serviceClient();
  const { data: cleaner } = await db
    .from("cleaners")
    .select(
      "id, cleaner_code, full_name, email, phone_e164, whatsapp_e164, bio, photo_path, account_status, availability, verified, deployment_ready, rating, completed_jobs, acceptance_rate, completion_rate, cancellation_rate, work_rate_label, joined_at"
    )
    .eq("id", cleanerId)
    .maybeSingle();
  if (!cleaner) throw new AppError("CLEANER_NOT_FOUND", "Cleaner not found.");

  const [zones, services] = await Promise.all([
    db
      .from("cleaner_zones")
      .select("zone:service_zones(code, name)")
      .eq("cleaner_id", cleanerId),
    db
      .from("cleaner_services")
      .select("approved, service:services(code, name)")
      .eq("cleaner_id", cleanerId),
  ]);

  return {
    ...cleaner,
    ready: isDeploymentReady(cleaner),
    zones: (zones.data ?? []).map((z: Record<string, any>) => z.zone).filter(Boolean),
    services: (services.data ?? [])
      .filter((s: Record<string, any>) => s.approved)
      .map((s: Record<string, any>) => s.service)
      .filter(Boolean),
  };
}

/**
 * Set availability. Enforces the readiness gate before allowing AVAILABLE.
 * Turning UNAVAILABLE is always permitted.
 */
export async function setAvailability(cleanerId: string, available: boolean) {
  const db = serviceClient();
  const { data: cleaner } = await db
    .from("cleaners")
    .select(READINESS_FIELDS)
    .eq("id", cleanerId)
    .maybeSingle();
  if (!cleaner) throw new AppError("CLEANER_NOT_FOUND", "Cleaner not found.");

  if (available && !isDeploymentReady(cleaner)) {
    throw new AppError(
      "CLEANER_NOT_READY",
      "Your account is not yet approved for jobs. An operator must verify and activate you first."
    );
  }

  const next = available ? "AVAILABLE" : "UNAVAILABLE";
  await db
    .from("cleaners")
    .update({ availability: next, last_active_at: new Date().toISOString() })
    .eq("id", cleanerId);

  return { availability: next };
}

// --------------------------------------------------------------------------
// Admin management
// --------------------------------------------------------------------------
export interface CleanerListFilters {
  status?: string;
  search?: string;
  limit?: number;
}

export async function listCleaners(filters: CleanerListFilters) {
  const db = serviceClient();
  let query = db
    .from("cleaners")
    .select(
      "id, cleaner_code, full_name, phone_e164, account_status, availability, verified, deployment_ready, rating, completed_jobs, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(filters.limit ?? 100, 200));

  if (filters.status) query = query.eq("account_status", filters.status);
  if (filters.search) query = query.ilike("full_name", `%${filters.search.trim()}%`);

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load cleaners.");
  return (data ?? []).map((c: any) => ({ ...c, ready: isDeploymentReady(c) }));
}

export async function getCleanerAdmin(id: string) {
  // Same shape as self view is fine for admin; add nothing customer-unsafe here
  // beyond what admins already see.
  return getMe(id);
}

/** Onboard a cleaner: create their Auth account and profile + zones/services. */
export async function createCleaner(input: CreateCleanerInput, admin: AdminContext) {
  const db = serviceClient();

  // 1. Create the Supabase Auth user (email confirmed, admin-provisioned).
  const { data: created, error: authErr } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { role: "cleaner", full_name: input.full_name },
  });
  if (authErr || !created?.user) {
    const msg = authErr?.message ?? "Could not create the cleaner account.";
    if (/already registered|already exists/i.test(msg)) {
      throw new AppError("EMAIL_IN_USE", "A user with this email already exists.");
    }
    throw new AppError("INTERNAL_ERROR", msg);
  }
  const authUserId = created.user.id;

  // 2. Insert the cleaner profile (starts in ONBOARDING / UNAVAILABLE).
  const { data: cleaner, error: insErr } = await db
    .from("cleaners")
    .insert({
      auth_user_id: authUserId,
      cleaner_code: newCleanerCode(),
      full_name: input.full_name,
      email: input.email,
      phone_e164: input.phone_e164,
      whatsapp_e164: input.whatsapp_e164 ?? null,
      bio: input.bio ?? null,
      account_status: "ONBOARDING",
      availability: "UNAVAILABLE",
      verified: false,
      deployment_ready: false,
    })
    .select("id, cleaner_code")
    .single();
  if (insErr || !cleaner) {
    // Roll back the orphaned auth user so re-onboarding is clean.
    await db.auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw new AppError("INTERNAL_ERROR", "Could not create the cleaner profile.");
  }

  await syncZones(cleaner.id, input.zone_codes);
  await syncServices(cleaner.id, input.service_codes);
  await audit(admin, "cleaner.created", cleaner.id, { email: input.email });

  return { id: cleaner.id, cleaner_code: cleaner.cleaner_code };
}

/** Approve/suspend/verify/deployment + profile + zones/services. */
export async function updateCleaner(id: string, patch: UpdateCleanerInput, admin: AdminContext) {
  const db = serviceClient();
  const { data: before } = await db
    .from("cleaners")
    .select("id, account_status, verified, deployment_ready")
    .eq("id", id)
    .maybeSingle();
  if (!before) throw new AppError("CLEANER_NOT_FOUND", "Cleaner not found.");

  const fields: Record<string, unknown> = {};
  for (const key of [
    "full_name",
    "bio",
    "whatsapp_e164",
    "account_status",
    "verified",
    "deployment_ready",
  ] as const) {
    if (patch[key] !== undefined) fields[key] = patch[key];
  }

  if (Object.keys(fields).length > 0) {
    await db.from("cleaners").update(fields).eq("id", id);
  }
  if (patch.zone_codes) await syncZones(id, patch.zone_codes);
  if (patch.service_codes) await syncServices(id, patch.service_codes);

  // If a cleaner is no longer deployment-ready, drop them out of the pool.
  const { data: after } = await db
    .from("cleaners")
    .select("account_status, verified, deployment_ready, availability")
    .eq("id", id)
    .single();
  if (after && after.availability === "AVAILABLE" && !isDeploymentReady(after)) {
    await db.from("cleaners").update({ availability: "UNAVAILABLE" }).eq("id", id);
  }

  await audit(admin, "cleaner.updated", id, { changes: patch });
  return getCleanerAdmin(id);
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
async function syncZones(cleanerId: string, zoneCodes: string[]) {
  const db = serviceClient();
  const { data: zones } = await db.from("service_zones").select("id, code").in("code", zoneCodes);
  await db.from("cleaner_zones").delete().eq("cleaner_id", cleanerId);
  if (zones && zones.length > 0) {
    await db
      .from("cleaner_zones")
      .insert(zones.map((z: Record<string, any>) => ({ cleaner_id: cleanerId, zone_id: z.id })));
  }
}

async function syncServices(cleanerId: string, serviceCodes: string[]) {
  const db = serviceClient();
  const { data: services } = await db.from("services").select("id, code").in("code", serviceCodes);
  await db.from("cleaner_services").delete().eq("cleaner_id", cleanerId);
  if (services && services.length > 0) {
    await db.from("cleaner_services").insert(
      services.map((s: Record<string, any>) => ({
        cleaner_id: cleanerId,
        service_id: s.id,
        approved: true,
      }))
    );
  }
}

async function audit(admin: AdminContext, action: string, cleanerId: string, after: unknown) {
  await serviceClient().from("audit_logs").insert({
    actor_auth_user_id: admin.authUserId,
    action,
    entity_type: "cleaner",
    entity_id: cleanerId,
    after_data: after,
  });
}
