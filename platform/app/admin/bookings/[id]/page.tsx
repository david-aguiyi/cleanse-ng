import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getBookingDetail } from "@/domain/admin/admin-service";
import { AppError } from "@/http/errors";
import AdminBar from "../../AdminBar";
import CustomerActions from "./CustomerActions";
import NotesForm from "./NotesForm";
import DispatchControls from "./DispatchControls";
import AssignmentActions from "./AssignmentActions";
import { naira, lagos, humanEvent } from "../../format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const admin = await getAdminContext();
  if (!admin) redirect(`/admin/login?next=/admin/bookings/${params.id}`);

  let detail;
  try {
    detail = await getBookingDetail(params.id);
  } catch (err) {
    if (err instanceof AppError && err.code === "BOOKING_NOT_FOUND") notFound();
    throw err;
  }

  const { booking, customer, address, items, payments, timeline, assignedCleaner } = detail;
  const addressLine = address
    ? [address.address_line1, address.estate, address.landmark].filter(Boolean).join(", ")
    : "—";

  const summary = [
    `Booking ${booking.public_reference}`,
    `${booking.property_bedrooms ?? ""}BR · ${lagos(booking.scheduled_start_at)}`,
    address ? `${addressLine}${address.directions ? ` (${address.directions})` : ""}` : "",
    `Total ${naira(Number(booking.total_kobo))}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} />
      <div className="admin-wrap">
        <p className="muted">
          <Link href="/admin/bookings">← Live bookings</Link>
        </p>
        <h1 className="admin-h1">{booking.public_reference}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 4px" }}>
          <span className={`pill pay-${String(booking.payment_status).toLowerCase()}`}>
            {booking.payment_status}
          </span>
          <span className={`pill ful-${String(booking.fulfilment_status).toLowerCase()}`}>
            {String(booking.fulfilment_status).replace(/_/g, " ")}
          </span>
          <span className="pill neutral">{booking.customer_status}</span>
        </div>

        <div className="detail-grid">
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card">
              <h3>Customer &amp; address</h3>
              <div className="kv">
                <span className="k">Name</span>
                <span>{customer?.full_name ?? "—"}</span>
              </div>
              <div className="kv">
                <span className="k">WhatsApp</span>
                <span>{customer?.whatsapp_e164 ?? "—"}</span>
              </div>
              <div className="kv">
                <span className="k">Phone</span>
                <span>{customer?.phone_e164 ?? "—"}</span>
              </div>
              <div className="kv">
                <span className="k">Email</span>
                <span>{customer?.email ?? "—"}</span>
              </div>
              <div className="kv">
                <span className="k">Address</span>
                <span style={{ textAlign: "right" }}>{addressLine}</span>
              </div>
              {address?.directions && (
                <div className="kv">
                  <span className="k">Directions</span>
                  <span style={{ textAlign: "right" }}>{address.directions}</span>
                </div>
              )}
              <h3 style={{ marginTop: 18 }}>Customer actions</h3>
              <CustomerActions
                whatsapp={customer?.whatsapp_e164 ?? ""}
                phone={customer?.phone_e164 ?? ""}
                summary={summary}
              />
            </div>

            <div className="card">
              <h3>Order</h3>
              {items.length === 0 && <p className="muted">No line items recorded.</p>}
              {items.map((it) => (
                <div className="kv" key={it.id}>
                  <span className="k">{it.description}</span>
                  <span>{naira(Number(it.line_total_kobo))}</span>
                </div>
              ))}
              <div className="kv" style={{ fontWeight: 700 }}>
                <span>Total</span>
                <span>{naira(Number(booking.total_kobo))}</span>
              </div>
            </div>

            <div className="card">
              <h3>Timeline</h3>
              {timeline.length === 0 && <p className="muted">No events yet.</p>}
              {timeline.map((ev) => (
                <div className="timeline-item" key={ev.id}>
                  <div className="ev">{humanEvent(ev.event_type)}</div>
                  <div className="ts">
                    {lagos(ev.created_at)} · {ev.actor_type}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card">
              <h3>Payment</h3>
              {payments.length === 0 && <p className="muted">No payment attempts.</p>}
              {payments.map((p) => (
                <div key={p.id} style={{ marginBottom: 10 }}>
                  <div className="kv">
                    <span className="k">Reference</span>
                    <span style={{ fontSize: 12 }}>{p.provider_reference}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Status</span>
                    <span className={`pill pay-${String(p.status).toLowerCase()}`}>{p.status}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Amount</span>
                    <span>{naira(Number(p.paid_amount_kobo ?? p.expected_amount_kobo))}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Channel</span>
                    <span>{p.channel ?? "—"}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Verified</span>
                    <span>{lagos(p.verified_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3>Dispatch</h3>
              <DispatchControls
                bookingId={booking.id}
                canDispatch={
                  booking.payment_status === "SUCCESS" &&
                  booking.customer_status === "CONFIRMED" &&
                  !["COMPLETED", "CANCELLED"].includes(booking.fulfilment_status)
                }
              />
            </div>

            <div className="card">
              <h3>Assigned cleaner</h3>
              {assignedCleaner ? (
                <>
                  <div className="kv">
                    <span className="k">Name</span>
                    <span>{assignedCleaner.full_name}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Cleaner ID</span>
                    <span>{assignedCleaner.cleaner_code}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Phone</span>
                    <span>{assignedCleaner.phone_e164}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Rating</span>
                    <span>{assignedCleaner.rating ?? "—"}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Jobs · completion</span>
                    <span>
                      {assignedCleaner.completed_jobs ?? 0} ·{" "}
                      {assignedCleaner.completion_rate ? `${assignedCleaner.completion_rate}%` : "—"}
                    </span>
                  </div>
                  <AssignmentActions bookingId={booking.id} />
                </>
              ) : (
                <p className="muted">
                  No cleaner assigned yet. Automated dispatch and the cleaner profile panel arrive in
                  Stages 6–9.
                </p>
              )}
            </div>

            <div className="card">
              <h3>Operations notes</h3>
              <NotesForm bookingId={booking.id} initialNotes={booking.operations_notes ?? null} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
