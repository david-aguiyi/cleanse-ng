import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listOperatorPayoutsOverview } from "@/domain/payout/payout-service";
import AdminBar from "../AdminBar";
import PayoutActions from "./PayoutActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function naira(n: number): string {
  return `₦${Math.round(n || 0).toLocaleString("en-NG")}`;
}

function lagosDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AdminPayoutsPage() {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/payouts");

  const overview = await listOperatorPayoutsOverview();
  const totalUnpaid = overview.cleaners.reduce((s, c) => s + c.unpaid_total_naira, 0);
  const cleanersDue = overview.cleaners.filter((c) => c.unpaid_total_naira > 0).length;

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="payouts" />
      <div className="admin-wrap">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="admin-h1">Cleanse Pro Payouts</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              70% cleaner share owed from served cleans. Confirming payment locks settled cleans for the month so nobody can be paid twice.
            </p>
          </div>
          <Link className="btn-ghost" href="/admin/jobs">
            ← Back to Jobs
          </Link>
        </div>

        {!overview.schemaReady && (
          <div className="notice error" style={{ marginTop: 16 }}>
            Database migration <code>0015_jobs_and_payouts.sql</code> has not been applied yet. Run it in Supabase to enable payout tracking and settlements.
          </div>
        )}

        <div className="stat-row" style={{ marginTop: 18 }}>
          <div className="stat-card">
            <div className="n">{naira(totalUnpaid)}</div>
            <div className="l">Total unpaid balance owed</div>
          </div>
          <div className="stat-card">
            <div className="n">{cleanersDue}</div>
            <div className="l">Cleanse Pros awaiting payout</div>
          </div>
          <div className="stat-card">
            <div className="n">{overview.recentPayouts.length}</div>
            <div className="l">Completed payout receipts</div>
          </div>
        </div>

        <h2 style={{ fontSize: 16, marginTop: 22, marginBottom: 10 }}>Owed &amp; Bank Accounts</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {overview.cleaners.map((c) => (
            <div key={c.cleaner_id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <Link href={`/admin/cleaners/${c.cleaner_id}`} style={{ fontWeight: 700, fontSize: 16, color: "var(--deep-purple)", textDecoration: "none" }}>
                    {c.full_name}
                  </Link>{" "}
                  <span className="pill neutral">{c.cleaner_code}</span>{" "}
                  <span className="pill neutral">{c.account_status}</span>
                  {c.last_payout && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Last paid: {naira(c.last_payout.total_amount_naira)} ({c.last_payout.period_key}) on{" "}
                      {lagosDate(c.last_payout.settled_at)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-header)", fontWeight: 700, fontSize: 20, color: c.unpaid_total_naira > 0 ? "var(--deep-purple)" : "var(--mid-gray)" }}>
                    {naira(c.unpaid_total_naira)}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {c.unpaid_count > 0
                      ? `${c.unpaid_count} unpaid served clean${c.unpaid_count === 1 ? "" : "s"}`
                      : "Cleared · ₦0 owed"}
                  </div>
                </div>
              </div>

              <PayoutActions
                cleanerId={c.cleaner_id}
                cleanerName={c.full_name}
                bankAccount={c.bank_account}
                unpaidTotalNaira={c.unpaid_total_naira}
                unpaidCount={c.unpaid_count}
                unpaidByMonth={c.unpaid_by_month}
                todayIso={overview.todayIso}
              />
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 16, marginTop: 28, marginBottom: 10 }}>Recent Settlement History</h2>
        <div className="board">
          <table>
            <thead>
              <tr>
                <th>Settled At</th>
                <th>Cleanse Pro</th>
                <th>Period</th>
                <th>Cleans</th>
                <th>Amount Paid</th>
                <th>Bank Snapshot</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentPayouts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 28, color: "var(--mid-gray)" }}>
                    No monthly settlements confirmed yet.
                  </td>
                </tr>
              )}
              {overview.recentPayouts.map((p) => (
                <tr key={p.id}>
                  <td>{lagosDate(p.settled_at)}</td>
                  <td>
                    <Link className="ref" href={`/admin/cleaners/${p.cleaner_id}`}>
                      {p.cleaner_name}
                    </Link>
                    <div className="muted" style={{ fontSize: 12 }}>{p.cleaner_code}</div>
                  </td>
                  <td>
                    <span className="pill pay-success">{p.period_key === "all" ? `Through ${p.cutoff_date}` : p.period_key}</span>
                  </td>
                  <td>{p.earning_count}</td>
                  <td><strong>{naira(p.total_amount_naira)}</strong></td>
                  <td>
                    <div>{p.bank_name} · <code>{p.account_number}</code></div>
                    <div className="muted" style={{ fontSize: 12 }}>{p.account_name}</div>
                  </td>
                  <td>{p.reference_note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

