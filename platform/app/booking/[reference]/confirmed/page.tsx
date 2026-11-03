import { notFound } from "next/navigation";
import { serviceClient } from "@/db/service-client";
import { formatNairaFromKobo } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Customer confirmation page (Blueprint §11.1 "Confirmed").
 * Shows only customer-safe details: booking reference, service, time, area,
 * paid amount. NO dispatch / cleaner-matching language is ever shown.
 *
 * Stage 2 reads server-side by reference. Hardening (Blueprint §7 GET
 * /confirmation) can add a signed-token gate for shareable links.
 */
function lagosDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function ConfirmedPage({
  params,
}: {
  params: { reference: string };
}) {
  const db = serviceClient();
  const { data: booking } = await db
    .from("bookings")
    .select(
      "public_reference, customer_status, scheduled_start_at, total_kobo, service_id, zone_id, property_bedrooms, customer_id"
    )
    .eq("public_reference", params.reference)
    .maybeSingle();

  if (!booking) notFound();

  const [{ data: service }, { data: zone }, { data: customer }] = await Promise.all([
    db.from("services").select("name").eq("id", booking.service_id).maybeSingle(),
    booking.zone_id
      ? db.from("service_zones").select("name").eq("id", booking.zone_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("customers").select("full_name").eq("id", booking.customer_id).maybeSingle(),
  ]);

  const paid = booking.customer_status === "CONFIRMED";
  const firstName = String(customer?.full_name ?? "").split(" ")[0] || "there";

  return (
    <main className="wizard">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="wizard-header">
          <a className="wizard-brand" href="/">
            CLEANSE.NG
          </a>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          {paid ? (
            <>
              <div className="confirm-badge" aria-hidden>
                ✓
              </div>
              <h1 className="step-title">You&apos;re booked, {firstName}! 🎉</h1>
              <p className="step-hint">
                Your payment was successful and your booking is confirmed. We&apos;re arranging your
                Cleanse professional now and will confirm the details with you on WhatsApp shortly.
              </p>
            </>
          ) : (
            <>
              <h1 className="step-title">Finalising your payment…</h1>
              <p className="step-hint">
                If you&apos;ve just paid, this page will confirm shortly. You can keep your booking
                reference below.
              </p>
            </>
          )}

          <div style={{ textAlign: "left", marginTop: 20 }}>
            <div className="summary-row">
              <span className="label">Booking reference</span>
              <span>
                <strong>{booking.public_reference}</strong>
              </span>
            </div>
            <div className="summary-row">
              <span className="label">Service</span>
              <span>
                {service?.name ?? "Cleaning"} · {booking.property_bedrooms}BR
              </span>
            </div>
            <div className="summary-row">
              <span className="label">When</span>
              <span>{lagosDateTime(booking.scheduled_start_at)}</span>
            </div>
            <div className="summary-row">
              <span className="label">Area</span>
              <span>{zone?.name ?? "—"}</span>
            </div>
            <div className="summary-row">
              <span className="label">Amount paid</span>
              <span>{formatNairaFromKobo(Number(booking.total_kobo))}</span>
            </div>
          </div>

          {paid && (
            <a
              className="btn-primary"
              href={`https://wa.me/2349130663739?text=${encodeURIComponent(
                `Hi Cleanse, I just booked a cleaning (ref ${booking.public_reference}). `
              )}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 20,
                background: "var(--neon-green)",
                color: "var(--deep-purple)",
              }}
            >
              Chat with us directly on WhatsApp
            </a>
          )}
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>
          Keep your booking reference for any questions.
        </p>
      </div>
    </main>
  );
}
