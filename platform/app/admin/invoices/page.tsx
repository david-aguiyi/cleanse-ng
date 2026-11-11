import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listInvoices } from "@/domain/invoice/invoice-service";
import { lagosTodayIso, summariseInvoiceSchedule } from "@/domain/invoice/schedule";
import { lagos, shortDate } from "../format";
import AdminBar from "../AdminBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export default async function AdminInvoices({ searchParams }: { searchParams: { q?: string } }) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/invoices");

  const invoices = await listInvoices(searchParams.q);

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="invoices" />
      <div className="admin-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 className="admin-h1">Invoices</h1>
          <Link className="btn-primary" href="/admin/invoices/new" style={{ padding: "12px 20px" }}>
            + New invoice
          </Link>
        </div>

        <form className="filters" method="get">
          <input name="q" placeholder="Search number, client or address…" defaultValue={searchParams.q ?? ""} />
          <button type="submit" className="btn-ghost">
            Search
          </button>
        </form>

        <div className="board">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Contract Period</th>
                <th>Serving Schedule</th>
                <th>Total</th>
                <th>Created</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--mid-gray)" }}>
                    No saved invoices yet. Tap “New invoice” to make the first one.
                  </td>
                </tr>
              )}
              {invoices.map((inv: Record<string, any>) => {
                const data = (inv.data || {}) as Record<string, any>;
                const start = data.startDate as string | undefined;
                const end = data.endDate as string | undefined;
                const isSingleDay = !end || start === end;
                const today = lagosTodayIso();
                const sched = summariseInvoiceSchedule(data);
                return (
                  <tr key={inv.id}>
                    <td>
                      <Link className="ref" href={`/admin/invoices/${inv.id}`}>
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td>
                      {inv.client_name || inv.client_address || "—"}
                      {inv.client_name && inv.client_address && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {inv.client_address}
                        </div>
                      )}
                    </td>
                    <td>
                      {start ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {shortDate(start)}
                            {!isSingleDay && ` – ${shortDate(end)}`}
                          </div>
                          <div style={{ marginTop: 3 }}>
                            {isSingleDay ? (
                              <span className="pill neutral" style={{ fontSize: 10, padding: "2px 8px" }}>
                                {start === today ? "Today" : start > today ? "Scheduled" : "Single day"}
                              </span>
                            ) : start > today ? (
                              <span className="pill neutral" style={{ fontSize: 10, padding: "2px 8px" }}>
                                Upcoming
                              </span>
                            ) : end && end >= today ? (
                              <span className="pill pay-success" style={{ fontSize: 10, padding: "2px 8px" }}>
                                Active
                              </span>
                            ) : (
                              <span className="pill neutral" style={{ fontSize: 10, padding: "2px 8px" }}>
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {sched.slotLabel ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {sched.daysLabel ? `${sched.daysLabel} · ` : ""}
                            {sched.slotLabel}
                          </div>
                          <div style={{ marginTop: 3, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            {sched.reservedOnCalendar ? (
                              <span className="pill pay-success" style={{ fontSize: 10, padding: "2px 8px" }}>
                                On calendar ({sched.visitCount} {sched.visitCount === 1 ? "visit" : "visits"})
                              </span>
                            ) : (
                              <span className="pill neutral" style={{ fontSize: 10, padding: "2px 8px" }}>
                                Not on calendar
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>No time set</span>
                      )}
                    </td>
                    <td>{naira(inv.total_naira)}</td>
                    <td>{lagos(inv.created_at)}</td>
                    <td>{inv.creator?.full_name ?? "—"}</td>
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
