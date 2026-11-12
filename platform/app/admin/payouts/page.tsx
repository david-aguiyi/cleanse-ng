import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listOperatorPayoutsOverview } from "@/domain/payout/payout-service";
import AdminShell from "../_components/AdminShell";
import StatusBadge from "../_components/StatusBadge";
import { humanCleanerStatus, nairaAmount } from "../format";
import PayoutActions from "./PayoutActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function lagosDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/payouts");

  const overview = await listOperatorPayoutsOverview();
  const totalUnpaid = overview.cleaners.reduce((s, c) => s + c.unpaid_total_naira, 0);
  const cleanersDueList = overview.cleaners.filter((c) => c.unpaid_total_naira > 0);
  const missingBankDueCount = cleanersDueList.filter((c) => !c.bank_account).length;

  const requestedView = searchParams.view;
  const activeView: "due" | "all" | "receipts" =
    requestedView === "due" || requestedView === "all" || requestedView === "receipts"
      ? requestedView
      : cleanersDueList.length > 0
        ? "due"
        : "all";

  const displayedCleaners = activeView === "due" ? cleanersDueList : overview.cleaners;

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="payouts"
      breadcrumbs={[{ label: "Payouts (70%)" }]}
      title="Cleanse Pro Payouts (70% Pool)"
      subtitle="Transfer to saved bank details, then tap Confirm Paid to zero settled balances and lock immutable payout receipts."
      actions={
        <Link className="ops-quick-btn" href="/admin/jobs">
          Review Jobs &amp; Visits →
        </Link>
      }
    >
      {!overview.schemaReady && (
        <div className="notice error" style={{ marginBottom: 16 }}>
          Database migration <code>0015_jobs_and_payouts.sql</code> has not been applied yet. Run it in
          Supabase to enable payout tracking and settlements.
        </div>
      )}

      <div className="ops-kpi-grid">
        <div className={`ops-kpi-card ${totalUnpaid > 0 ? "is-warn" : ""}`}>
          <span className="ops-kpi-label">Total Unpaid Balance Owed</span>
          <span className="ops-kpi-value">{nairaAmount(totalUnpaid)}</span>
          <span className="ops-kpi-sub">Earned from Served cleans not yet settled</span>
        </div>

        <div className="ops-kpi-card">
          <span className="ops-kpi-label">Cleanse Pros Due</span>
          <span className="ops-kpi-value">{cleanersDueList.length}</span>
          <span className="ops-kpi-sub">Out of {overview.cleaners.length} Cleanse Pros</span>
        </div>

        <div className={`ops-kpi-card ${missingBankDueCount > 0 ? "is-warn" : ""}`}>
          <span className="ops-kpi-label">Missing Bank Details</span>
          <span className="ops-kpi-value">{missingBankDueCount}</span>
          <span className="ops-kpi-sub">
            {missingBankDueCount > 0
              ? "Pros owed payout who haven't added bank info"
              : "All Pros due have bank info"}
          </span>
        </div>

        <div className="ops-kpi-card">
          <span className="ops-kpi-label">Settlement Receipts</span>
          <span className="ops-kpi-value">{overview.recentPayouts.length}</span>
          <span className="ops-kpi-sub">Immutable paid history log</span>
        </div>
      </div>

      <div className="ops-chips">
        <Link href="/admin/payouts?view=due" className={`ops-chip ${activeView === "due" ? "is-active" : ""}`}>
          <span>Awaiting Payment</span>
          <span className="ops-chip-count">{cleanersDueList.length}</span>
        </Link>
        <Link href="/admin/payouts?view=all" className={`ops-chip ${activeView === "all" ? "is-active" : ""}`}>
          <span>All Cleanse Pros</span>
          <span className="ops-chip-count">{overview.cleaners.length}</span>
        </Link>
        <Link
          href="/admin/payouts?view=receipts"
          className={`ops-chip ${activeView === "receipts" ? "is-active" : ""}`}
        >
          <span>Settlement Receipts</span>
          <span className="ops-chip-count">{overview.recentPayouts.length}</span>
        </Link>
      </div>

      {activeView !== "receipts" && (
        <div style={{ display: "grid", gap: 14 }}>
          {displayedCleaners.length === 0 && (
            <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--mid-gray)" }}>
              No unpaid balances owed right now! Switch to <strong>All Cleanse Pros</strong> or{" "}
              <strong>Settlement Receipts</strong> above to inspect past payouts.
            </div>
          )}

          {displayedCleaners.map((c) => {
            const missingBank = c.unpaid_total_naira > 0 && !c.bank_account;
            return (
              <div
                key={c.cleaner_id}
                className="card"
                style={{
                  padding: 18,
                  borderColor: missingBank ? "#fecaca" : undefined,
                  background: missingBank ? "#fffdfd" : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Link
                        href={`/admin/cleaners/${c.cleaner_id}`}
                        style={{
                          fontWeight: 800,
                          fontSize: 16,
                          color: "var(--deep-purple)",
                          textDecoration: "none",
                        }}
                      >
                        {c.full_name}
                      </Link>
                      <span className="pill neutral">{c.cleaner_code}</span>
                      <StatusBadge status={humanCleanerStatus(c.account_status)} />
                      {missingBank && (
                        <span className="ops-status tone-red">
                          Missing Bank Details — ask Pro to update /pro/profile
                        </span>
                      )}
                    </div>
                    {c.last_payout && (
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                        Last settled: {nairaAmount(c.last_payout.total_amount_naira)} (
                        {c.last_payout.period_key}) on {lagosDate(c.last_payout.settled_at)}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-header)",
                        fontWeight: 800,
                        fontSize: 22,
                        color: c.unpaid_total_naira > 0 ? "var(--deep-purple)" : "var(--mid-gray)",
                      }}
                    >
                      {nairaAmount(c.unpaid_total_naira)}
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
            );
          })}
        </div>
      )}

      {(activeView === "receipts" || overview.recentPayouts.length > 0) && (
        <section style={{ marginTop: activeView === "receipts" ? 0 : 28 }}>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Recent Settlement Receipts</h2>
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
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.cleaner_code}
                      </div>
                    </td>
                    <td>
                      <span className="ops-status tone-green">
                        {p.period_key === "all" ? `Through ${p.cutoff_date}` : p.period_key}
                      </span>
                    </td>
                    <td>{p.earning_count}</td>
                    <td>
                      <strong>{nairaAmount(p.total_amount_naira)}</strong>
                    </td>
                    <td>
                      <div>
                        {p.bank_name} · <code>{p.account_number}</code>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.account_name}
                      </div>
                    </td>
                    <td>{p.reference_note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AdminShell>
  );
}
