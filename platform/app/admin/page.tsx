import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getAdminOverviewData } from "@/domain/admin/overview-service";
import AdminShell from "./_components/AdminShell";
import StatusBadge from "./_components/StatusBadge";
import WorkflowBanner from "./WorkflowBanner";
import { humanJobStatus, humanVisitStatus, nairaAmount, shortDate } from "./format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin");

  const data = await getAdminOverviewData();
  const { kpis, attention, todayVisits, recentJobs, todayIso, counts } = data;

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="overview"
      navCounts={counts}
      breadcrumbs={[{ label: "Overview" }]}
      title="Operations Command Center"
      subtitle={`Today in Ibadan (${shortDate(todayIso)}): monitor scheduled cleans, clear blockers, and keep Cleanse Pros ready.`}
    >
      <WorkflowBanner />

      <div className="ops-kpi-grid">
        <Link href="/admin/jobs" className="ops-kpi-card">
          <span className="ops-kpi-label">Today&apos;s Scheduled Cleans</span>
          <span className="ops-kpi-value">{kpis.todayTotal}</span>
          <span className="ops-kpi-sub">
            {kpis.todayServed} served · {kpis.todayUpcoming} upcoming today
          </span>
        </Link>

        <Link
          href="/admin/jobs"
          className={`ops-kpi-card ${kpis.jobsActionNeeded > 0 ? "is-warn" : ""}`}
        >
          <span className="ops-kpi-label">Jobs Needing Action</span>
          <span className="ops-kpi-value">{kpis.jobsActionNeeded}</span>
          <span className="ops-kpi-sub">
            {kpis.activeJobsCount} active jobs total
          </span>
        </Link>

        <Link href="/admin/onboardings" className="ops-kpi-card">
          <span className="ops-kpi-label">Hiring &amp; Onboarding Queue</span>
          <span className="ops-kpi-value">{kpis.hiringQueueCount}</span>
          <span className="ops-kpi-sub">
            {kpis.activeProsCount} active Cleanse Pros ready
          </span>
        </Link>

        <Link
          href="/admin/payouts"
          className={`ops-kpi-card ${kpis.unpaidPoolNaira > 0 ? "is-warn" : ""}`}
        >
          <span className="ops-kpi-label">Unpaid 70% Payout Pool</span>
          <span className="ops-kpi-value">{nairaAmount(kpis.unpaidPoolNaira)}</span>
          <span className="ops-kpi-sub">
            Owed across {kpis.unpaidProsCount} {kpis.unpaidProsCount === 1 ? "Pro" : "Pros"}
          </span>
        </Link>
      </div>

      <div className="ops-overview-grid">
        {/* Left: Needs Attention + Recent Jobs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>Needs Attention Right Now</h2>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                  Unassigned jobs, pending quotes, contract renewals, and hiring approvals.
                </p>
              </div>
              <span className="pill neutral">{attention.length} items</span>
            </div>

            {attention.length === 0 ? (
              <div
                style={{
                  padding: "20px 16px",
                  borderRadius: 12,
                  background: "#ecfdf3",
                  border: "1px solid #bbf7d0",
                  color: "#065f46",
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                All caught up! No urgent job blockers, pending onboardings, or missing payout bank accounts right now.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {attention.map((item) => (
                  <div
                    key={item.id}
                    className={`ops-action-banner tone-${item.tone}`}
                    style={{ marginBottom: 0, padding: "12px 14px" }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="ops-action-title">{item.title}</div>
                      <div className="ops-action-desc">{item.detail}</div>
                    </div>
                    <Link href={item.href} className="ops-quick-btn" style={{ whiteSpace: "nowrap" }}>
                      {item.cta}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>Recent Invoice Jobs</h2>
              <Link href="/admin/jobs" style={{ fontSize: 13, fontWeight: 700 }}>
                View all Jobs →
              </Link>
            </div>

            {recentJobs.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                No invoice jobs yet. Create your first customer invoice to see it synced here automatically.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentJobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/admin/jobs/${j.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      textDecoration: "none",
                      color: "inherit",
                      background: "var(--off-white)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--deep-purple)" }}>
                        {j.invoice_number} · {j.client_name}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {j.service_name} · {j.client_area} ·{" "}
                        {j.cleaner_count === 0 ? (
                          <strong style={{ color: "#b45309" }}>No Pro assigned</strong>
                        ) : (
                          `${j.cleaner_count} Pro${j.cleaner_count > 1 ? "s" : ""}`
                        )}
                      </div>
                    </div>
                    <StatusBadge status={humanJobStatus(j.status)} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Today's Clean Schedule */}
        <section className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>Today&apos;s Clean Schedule</h2>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                Scheduled visits for {shortDate(todayIso)}. Tap a visit to mark Served or adjust attendance.
              </p>
            </div>
            <Link href="/admin/invoices/new" className="ops-quick-btn">
              + Invoice
            </Link>
          </div>

          {todayVisits.length === 0 ? (
            <div
              style={{
                padding: "28px 18px",
                textAlign: "center",
                border: "1px dashed var(--border)",
                borderRadius: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--deep-purple)", marginBottom: 4 }}>
                No visits scheduled for today
              </div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                Create an invoice with today&apos;s date or manage active recurring contracts in Jobs &amp; Visits.
              </div>
              <Link href="/admin/jobs" className="ops-quick-btn">
                Open Jobs &amp; Visits →
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {todayVisits.map((v) => (
                <div
                  key={v.visitId}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: v.visitStatus === "SERVED" ? "#f9fefb" : "var(--white)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-header)",
                          fontSize: 12,
                          fontWeight: 800,
                          color: "var(--primary-purple)",
                          background: "rgba(181, 188, 255, 0.25)",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {v.slot}
                      </span>
                      <StatusBadge status={humanVisitStatus(v.visitStatus)} />
                      <span className="muted" style={{ fontSize: 12 }}>{v.invoiceNumber}</span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--deep-purple)" }}>
                      {v.clientName} · <span style={{ fontWeight: 600 }}>{v.clientArea}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {v.serviceName} · 70% Pool: <strong>{nairaAmount(v.poolNaira)}</strong>
                    </div>
                    <div style={{ fontSize: 12.5, marginTop: 4 }}>
                      {v.cleaners.length === 0 ? (
                        <span style={{ color: "#991b1b", fontWeight: 700 }}>
                          ⚠️ No Cleanse Pro assigned yet
                        </span>
                      ) : (
                        <span>
                          Assigned:{" "}
                          <strong>{v.cleaners.map((c) => c.full_name).join(" + ")}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <Link href={`/admin/jobs/${v.jobId}`} className="ops-quick-btn">
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
