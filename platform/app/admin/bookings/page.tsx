import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listBookings } from "@/domain/admin/admin-service";
import AdminShell from "../_components/AdminShell";
import { naira, lagos, minutesSince } from "../format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_STATES = ["", "SUCCESS", "PENDING", "FAILED", "REFUNDED"];
const FULFILMENT_STATES = [
  "",
  "UNASSIGNED",
  "DISPATCHING",
  "PARTIALLY_ASSIGNED",
  "CLEANER_ASSIGNED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "EXCEPTION",
  "COMPLETED",
];

function pillClass(prefix: string, value: string): string {
  return `pill ${prefix}-${value.toLowerCase()}`;
}

export default async function AdminBoard({
  searchParams,
}: {
  searchParams: { payment_status?: string; fulfilment_status?: string; q?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/bookings");

  const rows = await listBookings({
    paymentStatus: searchParams.payment_status,
    fulfilmentStatus: searchParams.fulfilment_status,
    search: searchParams.q,
  });

  const paidUnassigned = rows.filter(
    (r) => r.payment_status === "SUCCESS" && r.fulfilment_status === "UNASSIGNED"
  ).length;

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="bookings"
      breadcrumbs={[{ label: "Online Bookings (Archived)" }]}
      title="Online Bookings (Archived View)"
      subtitle="All active Cleanse work now flows through Invoices → Jobs & Visits. Legacy self-checkout records remain readable here."
      actions={
        <Link className="ops-quick-btn is-primary" href="/admin/invoices">
          Go to Invoices →
        </Link>
      }
    >
      <div className="ops-action-banner tone-amber">
        <div>
          <div className="ops-action-title">Online Bookings hidden from active navigation</div>
          <div className="ops-action-desc">
            {rows.length} historical booking records · Create new client plans in{" "}
            <Link href="/admin/invoices/new">Invoices</Link> and manage them in{" "}
            <Link href="/admin/jobs">Jobs &amp; Visits</Link>.
          </div>
        </div>
      </div>

        <form className="filters" method="get">
          <select name="payment_status" defaultValue={searchParams.payment_status ?? ""}>
            {PAYMENT_STATES.map((s) => (
              <option key={s} value={s}>
                {s === "" ? "Paid & active (default)" : s === "PENDING" ? "Unpaid / abandoned" : s}
              </option>
            ))}
          </select>
          <select name="fulfilment_status" defaultValue={searchParams.fulfilment_status ?? ""}>
            {FULFILMENT_STATES.map((s) => (
              <option key={s} value={s}>
                {s === "" ? "All fulfilment" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input name="q" placeholder="Search reference…" defaultValue={searchParams.q ?? ""} />
          <button type="submit" className="btn-ghost">
            Filter
          </button>
        </form>

        <div className="board">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Scheduled</th>
                <th>Payment</th>
                <th>Fulfilment</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--mid-gray)" }}>
                    No bookings match these filters.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const mins =
                  r.payment_status === "SUCCESS" && r.fulfilment_status === "UNASSIGNED"
                    ? minutesSince(r.confirmed_at)
                    : null;
                return (
                  <tr key={r.id}>
                    <td>
                      <Link className="ref" href={`/admin/bookings/${r.id}`}>
                        {r.public_reference}
                      </Link>
                    </td>
                    <td>{r.customer_name}</td>
                    <td>
                      {r.service_name}
                      {r.property_bedrooms ? ` · ${r.property_bedrooms}BR` : ""}
                      {r.zone_name ? ` · ${r.zone_name}` : ""}
                    </td>
                    <td>{lagos(r.scheduled_start_at)}</td>
                    <td>
                      <span className={pillClass("pay", r.payment_status)}>{r.payment_status}</span>
                    </td>
                    <td>
                      <span className={pillClass("ful", r.fulfilment_status)}>
                        {r.fulfilment_status.replace(/_/g, " ")}
                      </span>
                      {mins !== null && mins >= 5 && (
                        <div className="sla-warn" style={{ fontSize: 11, marginTop: 3 }}>
                          {mins}m unassigned
                        </div>
                      )}
                    </td>
                    <td>{naira(r.total_kobo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    </AdminShell>
  );
}
