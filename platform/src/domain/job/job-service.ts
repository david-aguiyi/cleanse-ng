/**
 * Job execution (Blueprint §11.2 Active job, §13 job.completed). The assigned
 * cleaner advances the job ON_THE_WAY -> ARRIVED -> IN_PROGRESS -> COMPLETED;
 * the booking's fulfilment status mirrors the aggregate, and completion rolls up
 * cleaner metrics. Transitions are forward-only and guarded per assignment.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";

const STAGE_ORDER = ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"] as const;
type Stage = (typeof STAGE_ORDER)[number];
const TS_FIELD: Record<Exclude<Stage, "ASSIGNED">, string> = {
  ON_THE_WAY: "on_the_way_at",
  ARRIVED: "arrived_at",
  IN_PROGRESS: "started_at",
  COMPLETED: "completed_at",
};

export interface CleanerJobView {
  booking_id: string;
  booking_reference: string;
  service_name: string;
  property_bedrooms: number | null;
  scheduled_start_at: string;
  assignment_status: string;
  fulfilment_status: string;
  customer_first_name: string;
  customer_whatsapp: string;
  address_line1: string;
  estate: string | null;
  landmark: string | null;
  directions: string | null;
}

export interface ActiveJobSummary {
  booking_reference: string;
  service_name: string;
  status: string;
  scheduled_start_at: string;
}

/** The cleaner's current active jobs (for the home screen). */
export async function listActiveJobs(cleanerId: string): Promise<ActiveJobSummary[]> {
  const db = serviceClient();
  const { data } = await db
    .from("job_assignments")
    .select(
      "status, booking:bookings(public_reference, scheduled_start_at, service:services(name))"
    )
    .eq("cleaner_id", cleanerId)
    .in("status", ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"])
    .order("assigned_at", { ascending: false });

  return (data ?? []).map((a: Record<string, any>) => ({
    booking_reference: a.booking?.public_reference ?? "",
    service_name: a.booking?.service?.name ?? "Cleaning",
    status: a.status,
    scheduled_start_at: a.booking?.scheduled_start_at ?? "",
  }));
}

/** The cleaner's assigned job for a booking reference (full operational details). */
export async function getCleanerJob(reference: string, cleanerId: string): Promise<CleanerJobView> {
  const db = serviceClient();
  const { data: bookingRow } = await db
    .from("bookings")
    .select(
      "id, public_reference, property_bedrooms, scheduled_start_at, fulfilment_status, customer:customers(full_name, whatsapp_e164), address:customer_addresses(address_line1, estate, landmark, directions), service:services(name)"
    )
    .eq("public_reference", reference)
    .maybeSingle();
  const booking: any = bookingRow;
  if (!booking) throw new AppError("BOOKING_NOT_FOUND", "Job not found.");

  const { data: assignment } = await db
    .from("job_assignments")
    .select("status")
    .eq("booking_id", booking.id)
    .eq("cleaner_id", cleanerId)
    .in("status", ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"])
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assignment) throw new AppError("FORBIDDEN", "You are not assigned to this job.");

  return {
    booking_id: booking.id,
    booking_reference: booking.public_reference,
    service_name: booking.service?.name ?? "Cleaning",
    property_bedrooms: booking.property_bedrooms,
    scheduled_start_at: booking.scheduled_start_at,
    assignment_status: assignment.status,
    fulfilment_status: booking.fulfilment_status,
    customer_first_name: String(booking.customer?.full_name ?? "").split(" ")[0] ?? "",
    customer_whatsapp: booking.customer?.whatsapp_e164 ?? "",
    address_line1: booking.address?.address_line1 ?? "",
    estate: booking.address?.estate ?? null,
    landmark: booking.address?.landmark ?? null,
    directions: booking.address?.directions ?? null,
  };
}

/** Advance the cleaner's assignment; mirror the booking and roll up completion. */
export async function updateJobStatus(bookingId: string, cleanerId: string, next: Stage) {
  const db = serviceClient();
  const nowIso = new Date().toISOString();

  const { data: assignment } = await db
    .from("job_assignments")
    .select("id, status")
    .eq("booking_id", bookingId)
    .eq("cleaner_id", cleanerId)
    .in("status", ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"])
    .maybeSingle();
  if (!assignment) throw new AppError("FORBIDDEN", "You have no active assignment on this job.");

  const currentIdx = STAGE_ORDER.indexOf(assignment.status as Stage);
  const nextIdx = STAGE_ORDER.indexOf(next);
  if (nextIdx <= currentIdx) {
    throw new AppError("VALIDATION_ERROR", `Cannot move from ${assignment.status} to ${next}.`);
  }

  const patch: Record<string, unknown> = { status: next };
  patch[TS_FIELD[next as Exclude<Stage, "ASSIGNED">]] = nowIso;
  if (next === "COMPLETED") patch.ended_at = nowIso;
  await db.from("job_assignments").update(patch).eq("id", assignment.id);

  await db.from("booking_events").insert({
    booking_id: bookingId,
    event_type: `cleaner.${next.toLowerCase()}`,
    actor_type: "CLEANER",
    actor_id: cleanerId,
    data: { assignment_id: assignment.id },
  });

  await recomputeBookingFulfilment(bookingId);
  if (next === "COMPLETED") await rollUpCleanerMetrics(cleanerId);

  return { status: next };
}

/** Booking fulfilment mirrors the least-advanced active slot; COMPLETED when all done. */
async function recomputeBookingFulfilment(bookingId: string): Promise<void> {
  const db = serviceClient();
  const { data: booking } = await db
    .from("bookings")
    .select("requested_cleaner_count")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return;

  const { data: assignments } = await db
    .from("job_assignments")
    .select("status")
    .eq("booking_id", bookingId)
    .in("status", ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"]);

  const rows = assignments ?? [];
  const completed = rows.filter((a: Record<string, any>) => a.status === "COMPLETED").length;

  if (completed >= booking.requested_cleaner_count && rows.length >= booking.requested_cleaner_count) {
    const nowIso = new Date().toISOString();
    await db
      .from("bookings")
      .update({
        fulfilment_status: "COMPLETED",
        customer_status: "COMPLETED",
        completed_at: nowIso,
      })
      .eq("id", bookingId);
    await db.from("booking_events").insert({
      booking_id: bookingId,
      event_type: "job.completed",
      actor_type: "SYSTEM",
      data: {},
    });
    return;
  }

  // Otherwise mirror the least-advanced active (non-completed) slot.
  const active = rows.filter((a: Record<string, any>) => a.status !== "COMPLETED");
  if (active.length === 0) return;
  const minStage = active
    .map((a: Record<string, any>) => STAGE_ORDER.indexOf(a.status as Stage))
    .reduce((m: number, i: number) => Math.min(m, i), STAGE_ORDER.length);
  const mirror = STAGE_ORDER[minStage] ?? "ASSIGNED";
  const fulfilment =
    mirror === "ASSIGNED"
      ? completed > 0
        ? "PARTIALLY_ASSIGNED"
        : "CLEANER_ASSIGNED"
      : mirror; // ON_THE_WAY / ARRIVED / IN_PROGRESS
  await db.from("bookings").update({ fulfilment_status: fulfilment }).eq("id", bookingId);
}

/** Recompute completed_jobs + completion/cancellation rates from assignment history. */
async function rollUpCleanerMetrics(cleanerId: string): Promise<void> {
  const db = serviceClient();
  const { data: all } = await db
    .from("job_assignments")
    .select("status")
    .eq("cleaner_id", cleanerId);
  const rows = all ?? [];
  const completed = rows.filter((a: Record<string, any>) => a.status === "COMPLETED").length;
  const cancelled = rows.filter((a: Record<string, any>) =>
    ["CANCELLED", "REASSIGNED"].includes(a.status)
  ).length;
  const denom = completed + cancelled;
  const completionRate = denom > 0 ? Math.round((completed / denom) * 100) : null;
  const cancellationRate = denom > 0 ? Math.round((cancelled / denom) * 100) : null;

  await db
    .from("cleaners")
    .update({
      completed_jobs: completed,
      completion_rate: completionRate,
      cancellation_rate: cancellationRate,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", cleanerId);
}
