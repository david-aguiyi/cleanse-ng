/**
 * AdminService — operations views and low-risk actions for the control centre
 * (Blueprint §11.3, §7 admin endpoints). Reads use the service client; every
 * caller has already passed requireAdmin().
 */
import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import type { AdminContext } from "@/auth/admin";

export interface BookingListFilters {
  paymentStatus?: string;
  fulfilmentStatus?: string;
  search?: string;
  limit?: number;
}

export interface BookingListRow {
  id: string;
  public_reference: string;
  scheduled_start_at: string;
  customer_status: string;
  fulfilment_status: string;
  payment_status: string;
  total_kobo: number;
  currency: string;
  created_at: string;
  confirmed_at: string | null;
  property_bedrooms: number | null;
  customer_name: string;
  customer_whatsapp: string;
  zone_name: string | null;
  service_name: string;
}

/** Operations board — paid bookings first, newest first, with filters/search. */
export async function listBookings(filters: BookingListFilters): Promise<BookingListRow[]> {
  const db = serviceClient();
  let query = db
    .from("bookings")
    .select(
      "id, public_reference, scheduled_start_at, customer_status, fulfilment_status, payment_status, total_kobo, currency, created_at, confirmed_at, property_bedrooms, customers(full_name, whatsapp_e164), zone:service_zones(name), service:services(name)"
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(filters.limit ?? 100, 200));

  if (filters.paymentStatus) {
    query = query.eq("payment_status", filters.paymentStatus);
  } else {
    // Default view hides not-yet-paid (abandoned) bookings so the board shows
    // real, paid work. Choose the "Unpaid / abandoned" filter to see them.
    query = query.neq("payment_status", "PENDING");
  }
  if (filters.fulfilmentStatus) query = query.eq("fulfilment_status", filters.fulfilmentStatus);
  if (filters.search) {
    const term = filters.search.trim();
    query = query.ilike("public_reference", `%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load bookings.");

  return (data ?? []).map((b: Record<string, any>) => ({
    id: b.id,
    public_reference: b.public_reference,
    scheduled_start_at: b.scheduled_start_at,
    customer_status: b.customer_status,
    fulfilment_status: b.fulfilment_status,
    payment_status: b.payment_status,
    total_kobo: Number(b.total_kobo),
    currency: b.currency,
    created_at: b.created_at,
    confirmed_at: b.confirmed_at,
    property_bedrooms: b.property_bedrooms,
    customer_name: b.customers?.full_name ?? "—",
    customer_whatsapp: b.customers?.whatsapp_e164 ?? "",
    zone_name: b.zone?.name ?? null,
    service_name: b.service?.name ?? "Cleaning",
  }));
}

export interface BookingDetail {
  booking: Record<string, any>;
  customer: Record<string, any> | null;
  address: Record<string, any> | null;
  items: Record<string, any>[];
  payments: Record<string, any>[];
  timeline: Record<string, any>[];
  assignedCleaner: Record<string, any> | null;
  assignment: Record<string, any> | null;
}

/** Full booking control-centre view (Blueprint §11.3 Booking detail). */
export async function getBookingDetail(id: string): Promise<BookingDetail> {
  const db = serviceClient();

  const { data: booking } = await db.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!booking) throw new AppError("BOOKING_NOT_FOUND", "Booking not found.");

  const [customer, address, items, payments, timeline] = await Promise.all([
    db.from("customers").select("*").eq("id", booking.customer_id).maybeSingle(),
    db.from("customer_addresses").select("*").eq("id", booking.address_id).maybeSingle(),
    db.from("booking_items").select("*").eq("booking_id", id),
    db.from("payments").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
    db
      .from("booking_events")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
  ]);

  // Latest assignment (for on-site timestamps + completion report).
  const { data: assignment } = await db
    .from("job_assignments")
    .select(
      "status, assigned_at, on_the_way_at, arrived_at, started_at, completed_at, end_reason, completion_report"
    )
    .eq("booking_id", id)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let assignedCleaner: Record<string, any> | null = null;
  if (booking.assigned_cleaner_id) {
    const { data } = await db
      .from("cleaners")
      .select(
        "id, cleaner_code, full_name, phone_e164, whatsapp_e164, bio, photo_path, rating, completed_jobs, acceptance_rate, completion_rate, cancellation_rate, account_status"
      )
      .eq("id", booking.assigned_cleaner_id)
      .maybeSingle();
    assignedCleaner = data ?? null;
  }

  return {
    booking,
    customer: customer.data ?? null,
    address: address.data ?? null,
    items: items.data ?? [],
    payments: payments.data ?? [],
    timeline: timeline.data ?? [],
    assignedCleaner,
    assignment: assignment ?? null,
  };
}

/** Append a timestamped operations note (Blueprint §11.3 admin notes). */
export async function addOperationsNote(
  bookingId: string,
  note: string,
  admin: AdminContext
): Promise<string> {
  const db = serviceClient();
  const { data: booking } = await db
    .from("bookings")
    .select("operations_notes")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw new AppError("BOOKING_NOT_FOUND", "Booking not found.");

  const stamp = new Date().toISOString();
  const entry = `[${stamp}] ${admin.fullName}: ${note}`;
  const combined = booking.operations_notes ? `${booking.operations_notes}\n${entry}` : entry;

  await db.from("bookings").update({ operations_notes: combined }).eq("id", bookingId);
  await db.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "admin.note_added",
    actor_type: "ADMIN",
    actor_id: admin.adminId,
    data: { note },
  });
  await db.from("audit_logs").insert({
    actor_auth_user_id: admin.authUserId,
    action: "booking.note_added",
    entity_type: "booking",
    entity_id: bookingId,
    after_data: { note },
  });

  return combined;
}
