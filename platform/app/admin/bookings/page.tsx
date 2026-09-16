import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listBookings } from "@/domain/admin/admin-service";
import AdminBar from "../AdminBar";
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
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} />
      <div className="admin-wrap">
        <h1 className="admin-h1">Live bookings</h1>
        <p className="muted">
          {rows.length} shown · {paidUnassigned} paid &amp; awaiting a cleaner
        </p>

        <form className="filters" method="get">
          <select name="payment_status" defaultValue={searchParams.payment_status ?? ""}>
            {PAYMENT_STATES.map((s) => (
              <option key={s} value={s}>
                {s === "" ? "All payments" : s}
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
      </div>
    </main>
  );
}
