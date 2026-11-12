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
  const { paidSummary } = overview;
  const totalUnpaid = overview.cleaners.reduce((s, c) => s + c.unpaid_total_naira, 0);
  const cleanersDueList = overview.cleaners.filter((c) => c.unpaid_total_naira > 0);
  const missingBankDueCount = cleanersDueList.filter((c) => !c.bank_account).length;

  const requestedView = searchParams.view;
  const activeView: "due" | "monthly" | "all" | "receipts" =
    requestedView === "due" ||
    requestedView === "monthly" ||
    requestedView === "all" ||
    requestedView === "receipts"
      ? requestedView
      : cleanersDueList.length > 0
        ? "due"
        : "monthly";

  const displayedCleaners = activeView === "due" ? cleanersDueList : overview.cleaners;
  const showCleanerCards = activeView === "due" || activeView === "all";
  const showMonthlyTable = activeView === "monthly" || activeView === "receipts";

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="payouts"
      breadcrumbs={[{ label: "Payouts (70%)" }]}
      title="Cleanse Pro Payouts (70% Pool)"
      subtitle="Transfer to saved bank details, confirm payouts, and track cumulative totals & workers paid in every month."
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
        <Link
          href="/admin/payouts?view=due"
          className={`ops-kpi-card ${totalUnpaid > 0 ? "is-warn" : ""}`}
        >
          <span className="ops-kpi-label">Unpaid Owed Now</span>
          <span className="ops-kpi-value">{nairaAmount(totalUnpaid)}</span>
          <span className="ops-kpi-sub">
            {cleanersDueList.length} Cleanse {cleanersDueList.length === 1 ? "Pro" : "Pros"} awaiting payout
            {missingBankDueCount > 0 ? ` · ${missingBankDueCount} missing bank info` : ""}
          </span>
        </Link>

        <Link href="/admin/payouts?view=monthly" className="ops-kpi-card">
          <span className="ops-kpi-label">Paid in {paidSummary.current_month_label}</span>
          <span className="ops-kpi-value">{nairaAmount(paidSummary.this_month_paid_naira)}</span>
          <span className="ops-kpi-sub">
            {paidSummary.this_month_workers_paid_count}{" "}
            {paidSummary.this_month_workers_paid_count === 1 ? "worker" : "workers"} paid this month
          </span>
        </Link>

        <Link href="/admin/payouts?view=monthly" className="ops-kpi-card">
          <span className="ops-kpi-label">Total Paid (All Time)</span>
          <span className="ops-kpi-value">{nairaAmount(paidSummary.cumulative_paid_naira)}</span>
          <span className="ops-kpi-sub">
            {paidSummary.cumulative_workers_paid_count} unique{" "}
            {paidSummary.cumulative_workers_paid_count === 1 ? "worker" : "workers"} ·{" "}
            {paidSummary.cumulative_cleans_count} cleans settled
          </span>
        </Link>

        <Link href="/admin/payouts?view=receipts" className="ops-kpi-card">
          <span className="ops-kpi-label">Settlement Receipts</span>
          <span className="ops-kpi-value">{paidSummary.cumulative_settlement_count}</span>
          <span className="ops-kpi-sub">Across {paidSummary.months.length} active billing months</span>
        </Link>
      </div>

      <div className="ops-chips">
        <Link href="/admin/payouts?view=due" className={`ops-chip ${activeView === "due" ? "is-active" : ""}`}>
          <span>Awaiting Payment</span>
          <span className="ops-chip-count">{cleanersDueList.length}</span>
        </Link>
        <Link
          href="/admin/payouts?view=monthly"
          className={`ops-chip ${activeView === "monthly" ? "is-active" : ""}`}
        >
          <span>Total Paid by Month</span>
          <span className="ops-chip-count">{paidSummary.months.length}</span>
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

      {showMonthlyTable && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>Cumulative Paid by Month</h2>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                Total paid each month, how many unique workers were paid, and running all-time cumulative payout.
              </p>
            </div>
            <div style={{ fontFamily: "var(--font-header)", fontWeight: 700, fontSize: 14, color: "var(--deep-purple)" }}>
              All-time cumulative: {nairaAmount(paidSummary.cumulative_paid_naira)} (
              {paidSummary.cumulative_workers_paid_count} workers)
            </div>
          </div>

          <div className="board">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Workers Paid</th>
                  <th>Cleans &amp; Payouts</th>
                  <th>Paid in Month</th>
                  <th>Cumulative Total</th>
                  <th>Breakdown by Worker</th>
                </tr>
              </thead>
              <tbody>
                {paidSummary.months.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--mid-gray)" }}>
                      No confirmed worker payouts yet. Once you tap Confirm Paid on a Pro, monthly cumulative
                      totals appear here.
                    </td>
                  </tr>
                )}
                {paidSummary.months.map((m) => (
                  <tr key={m.month_key}>
                    <td>
                      <strong style={{ color: "var(--deep-purple)" }}>{m.month_label}</strong>
                      <div className="muted" style={{ fontSize: 11.5 }}>
                        {m.month_key}
                      </div>
                    </td>
                    <td>
                      <span className="ops-status tone-purple">
                        {m.workers_paid_count} {m.workers_paid_count === 1 ? "worker paid" : "workers paid"}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <strong>{m.cleans_count}</strong> cleans · {m.settlement_count}{" "}
                      {m.settlement_count === 1 ? "payout" : "payouts"}
                    </td>
                    <td>
                      <strong style={{ fontSize: 15, color: "#065f46" }}>
                        {nairaAmount(m.total_paid_naira)}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ color: "var(--deep-purple)" }}>
                        {nairaAmount(m.cumulative_paid_through_month_naira)}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {m.workers.map((w) => (
                          <Link
                            key={w.cleaner_id}
                            href={`/admin/cleaners/${w.cleaner_id}`}
                            className="pill neutral"
                            style={{ textDecoration: "none", fontSize: 11.5 }}
                          >
                            {w.cleaner_name} · {nairaAmount(w.amount_naira)}
                          </Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showCleanerCards && (
        <div style={{ display: "grid", gap: 14 }}>
          {displayedCleaners.length === 0 && (
            <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--mid-gray)" }}>
              No unpaid balances owed right now! Click{" "}
              <Link href="/admin/payouts?view=monthly" style={{ fontWeight: 700 }}>
                Total Paid by Month
              </Link>{" "}
              or <strong>All Cleanse Pros</strong> above to view past payouts.
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

      {(activeView === "receipts" || activeView === "monthly" || overview.recentPayouts.length > 0) && (
        <section style={{ marginTop: showCleanerCards || showMonthlyTable ? 28 : 0 }}>
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
