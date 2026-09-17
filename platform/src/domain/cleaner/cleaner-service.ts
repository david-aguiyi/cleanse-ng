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
      "id, cleaner_code, full_name, email, phone_e164, whatsapp_e164, bio, photo_path, account_status, availability, verified, deployment_ready, rating, completed_jobs, acceptance_rate, completion_rate, cancellation_rate, work_rate_label, joined_at, paused_at, blocked_at, block_reason"
    )
    .eq("id", cleanerId)
    .maybeSingle();
  if (!cleaner) throw new AppError("CLEANER_NOT_FOUND", "Cleaner not found.");

  const [zones, services, lastJob] = await Promise.all([
    db
      .from("cleaner_zones")
      .select("zone:service_zones(code, name)")
      .eq("cleaner_id", cleanerId),
    db
      .from("cleaner_services")
      .select("approved, service:services(code, name)")
      .eq("cleaner_id", cleanerId),
    db
      .from("job_assignments")
      .select("assigned_at")
      .eq("cleaner_id", cleanerId)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lastAssignedAt = (lastJob.data as { assigned_at?: string } | null)?.assigned_at ?? null;
  const sinceMs = Date.now() - new Date(lastAssignedAt ?? cleaner.joined_at).getTime();
  const idleDays = Math.floor(sinceMs / 86400000);

  return {
    ...cleaner,
    ready: isDeploymentReady(cleaner),
    last_assigned_at: lastAssignedAt,
    idle_days: idleDays,
    zones: (zones.data ?? []).map((z: Record<string, any>) => z.zone).filter(Boolean),
    services: (services.data ?? [])
      .filter((s: Record<string, any>) => s.approved)
      .map((s: Record<string, any>) => s.service)
      .filter(Boolean),
  };
}

/** Cleaner pauses their own account (self-stop). No longer dispatchable. */
export async function pauseSelf(cleanerId: string) {
  const db = serviceClient();
  await db
    .from("cleaners")
    .update({
      account_status: "INACTIVE",
      availability: "UNAVAILABLE",
      paused_at: new Date().toISOString(),
    })
    .eq("id", cleanerId)
    .neq("account_status", "SUSPENDED"); // a blocked cleaner cannot self-change
  return { account_status: "INACTIVE" };
}

/** Cleaner resumes their own paused account. Blocked accounts cannot self-resume. */
export async function resumeSelf(cleanerId: string) {
  const db = serviceClient();
  const { data: c } = await db
    .from("cleaners")
    .select("account_status")
    .eq("id", cleanerId)
    .maybeSingle();
  if (!c) throw new AppError("CLEANER_NOT_FOUND", "Cleaner not found.");
  if (String(c.account_status) === "SUSPENDED") {
    throw new AppError("CLEANER_TIME_CONFLICT", "Your account is blocked. Please contact the office.");
  }
  await db
    .from("cleaners")
    .update({ account_status: "ACTIVE", paused_at: null })
    .eq("id", cleanerId)
    .eq("account_status", "INACTIVE");
  return { account_status: "ACTIVE" };
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

/**
 * Admin performance leaderboard. Ranks cleaners by a blended reputation score
 * (rating + completion − cancellation), with completed volume as a tiebreak, and
 * an "issues" count (jobs reassigned away or cancelled) as a quality signal.
 */
export async function getLeaderboard(limit = 200) {
  const db = serviceClient();
  const { data: cleaners } = await db
    .from("cleaners")
    .select(
      "id, cleaner_code, full_name, account_status, availability, rating, completed_jobs, completion_rate, cancellation_rate, acceptance_rate"
    )
    .limit(limit);

  const { data: asg } = await db.from("job_assignments").select("cleaner_id, status");
  const issues: Record<string, number> = {};
  (asg ?? []).forEach((a: Record<string, any>) => {
    if (a.status === "REASSIGNED" || a.status === "CANCELLED") {
      issues[a.cleaner_id] = (issues[a.cleaner_id] ?? 0) + 1;
    }
  });

  const rows: any[] = (cleaners ?? []).map((c: Record<string, any>) => {
    const score =
      (Number(c.rating) || 4.6) * 10 +
      (Number(c.completion_rate) || 90) * 0.4 -
      (Number(c.cancellation_rate) || 0) * 0.6;
    return {
      ...c,
      issues: issues[c.id] ?? 0,
      priority_score: Math.round(score * 10) / 10,
    };
  });
  rows.sort(
    (a, b) => b.priority_score - a.priority_score || (b.completed_jobs || 0) - (a.completed_jobs || 0)
  );
  return rows;
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

  // Block / unblock metadata driven by account_status transitions.
  if (patch.account_status === "SUSPENDED") {
    fields.blocked_at = new Date().toISOString();
    fields.block_reason = patch.block_reason ?? "Blocked by admin.";
    fields.availability = "UNAVAILABLE";
  } else if (patch.account_status && before.account_status === "SUSPENDED") {
    // Unblocking (status changed away from SUSPENDED): clear the block markers.
    fields.blocked_at = null;
    fields.block_reason = null;
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
