import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listInvoiceJobs } from "@/domain/job/invoice-job-service";
import { JOB_STATUSES } from "@/domain/job/pricing";
import AdminShell from "../_components/AdminShell";
import StatusBadge from "../_components/StatusBadge";
import { humanJobStatus, nairaAmount, shortDate } from "../format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOB_FILTER_TABS: Array<{ id: string; label: string }> = [
  { id: "ALL", label: "All Jobs" },
  { id: "ACTIVE", label: "Active" },
  { id: "NEEDS_PRO", label: "Needs Pro" },
  { id: "PENDING", label: "Awaiting Payment" },
  { id: "PAUSED", label: "Paused" },
  { id: "ENDED", label: "Completed" },
  { id: "TERMINATED", label: "Terminated" },
];

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/jobs");

  const rawFilter = String(searchParams.status ?? "ALL").toUpperCase();
  const isCustomNeedsPro = rawFilter === "NEEDS_PRO";
  const dbStatusFilter =
    !isCustomNeedsPro && (JOB_STATUSES as readonly string[]).includes(rawFilter)
      ? rawFilter
      : isCustomNeedsPro
        ? "ACTIVE"
        : undefined;

  const search = searchParams.q || undefined;
  const { schemaReady, jobs } = await listInvoiceJobs({
    status: dbStatusFilter,
    search,
  });

  const visibleJobs = isCustomNeedsPro
    ? jobs.filter((j) => j.status === "ACTIVE" && j.cleaners.length === 0)
    : jobs;

  const activeCount = visibleJobs.filter((j) => j.status === "ACTIVE").length;
  const needsProCount = visibleJobs.filter((j) => j.status === "ACTIVE" && j.cleaners.length === 0).length;
  const scheduledTotal = visibleJobs.reduce(
    (s, j) => s + (j.status === "ACTIVE" ? j.visits_scheduled : 0),
    0
  );
  const totalUnpaidEarned = visibleJobs.reduce((s, j) => s + j.unpaid_earned_naira, 0);

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="jobs"
      breadcrumbs={[{ label: "Jobs & Visits" }]}
      title="Jobs &amp; Visits"
      subtitle="Automatically created from saved invoices. Assign 1–2 Cleanse Pros, manage contract status, and mark cleans Served."
      actions={
        <Link className="btn-primary" href="/admin/invoices/new" style={{ padding: "10px 18px" }}>
          + New Invoice / Job
        </Link>
      }
    >
      {!schemaReady && (
        <div className="notice error" style={{ marginBottom: 16 }}>
          Database migration <code>0015_jobs_and_payouts.sql</code> has not been applied yet. Run it in
          Supabase to start syncing saved invoices into Jobs.
        </div>
      )}

      <div className="ops-kpi-grid">
        <div className="ops-kpi-card">
          <span className="ops-kpi-label">Active Plans</span>
          <span className="ops-kpi-value">{activeCount}</span>
          <span className="ops-kpi-sub">{visibleJobs.length} jobs in view</span>
        </div>

        <Link
          href="/admin/jobs?status=NEEDS_PRO"
          className={`ops-kpi-card ${needsProCount > 0 ? "is-warn" : ""}`}
        >
          <span className="ops-kpi-label">Active Without Pro</span>
          <span className="ops-kpi-value">{needsProCount}</span>
          <span className="ops-kpi-sub">
            {needsProCount > 0 ? "Tap to assign Cleanse Pros" : "All active jobs assigned"}
          </span>
        </Link>

        <div className="ops-kpi-card">
          <span className="ops-kpi-label">Upcoming Scheduled Visits</span>
          <span className="ops-kpi-value">{scheduledTotal}</span>
          <span className="ops-kpi-sub">Across active plans in view</span>
        </div>

        <Link href="/admin/payouts" className="ops-kpi-card">
          <span className="ops-kpi-label">Unpaid 70% Pool (Listed)</span>
          <span className="ops-kpi-value">{nairaAmount(totalUnpaidEarned)}</span>
          <span className="ops-kpi-sub">Open Payouts Desk →</span>
        </Link>
      </div>

      <div className="ops-chips">
        {JOB_FILTER_TABS.map((tab) => {
          const isCurrent = rawFilter === tab.id;
          const href =
            tab.id === "ALL"
              ? search
                ? `/admin/jobs?q=${encodeURIComponent(search)}`
                : "/admin/jobs"
              : `/admin/jobs?status=${tab.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
          return (
            <Link key={tab.id} href={href} className={`ops-chip ${isCurrent ? "is-active" : ""}`}>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      <form className="filters" method="get">
        {rawFilter !== "ALL" && <input type="hidden" name="status" value={rawFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder="Search invoice #, client, phone, address…"
        />
        <button type="submit" className="btn-ghost">
          Search
        </button>
      </form>

      <div className="board">
        <table>
          <thead>
            <tr>
              <th>Job &amp; Service</th>
              <th>Client &amp; Location</th>
              <th>Status &amp; Period</th>
              <th>Assigned Team</th>
              <th>Schedule &amp; Progress</th>
              <th>Economics &amp; 70% Cut</th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--mid-gray)" }}>
                  {search || rawFilter !== "ALL"
                    ? "No jobs match that filter."
                    : "No jobs yet. Save an invoice to create your first job automatically."}
                </td>
              </tr>
            )}
            {visibleJobs.map((j) => (
              <tr key={j.id}>
                <td>
                  <Link className="ref" href={`/admin/jobs/${j.id}`}>
                    {j.invoice_number}
                  </Link>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>
                    {j.service_name}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {j.property_bedrooms}BR · {j.billing === "monthly" ? `${j.sessions_count} sessions/mo` : "One-off"}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: "var(--deep-purple)" }}>
                    {j.client_name || "Unnamed client"}
                  </div>
                  {j.client_phone && (
                    <div style={{ fontSize: 12.5, color: "var(--primary-purple)", fontWeight: 600 }}>
                      {j.client_phone}
                    </div>
                  )}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {[j.client_address, j.client_area].filter(Boolean).join(" · ") || "—"}
                  </div>
                </td>
                <td>
                  <StatusBadge status={humanJobStatus(j.status)} />
                  {j.suggested_end && (
                    <div style={{ marginTop: 5 }}>
                      <span className="ops-status tone-amber" style={{ fontSize: 11 }}>
                        Dates ended — Mark Completed
                      </span>
                    </div>
                  )}
                  {j.contract_start && (
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                      {shortDate(j.contract_start)}
                      {j.contract_end && j.contract_end !== j.contract_start
                        ? ` – ${shortDate(j.contract_end)}`
                        : ""}
                    </div>
                  )}
                </td>
                <td>
                  {j.cleaners.length === 0 ? (
                    <span className="ops-status tone-red" style={{ fontSize: 11 }}>
                      Needs Pro
                    </span>
                  ) : (
                    <div style={{ display: "grid", gap: 4 }}>
                      {j.cleaners.map((c) => (
                        <div key={c.cleaner_id} style={{ fontSize: 13 }}>
                          <strong>{c.full_name}</strong>{" "}
                          <span className="muted" style={{ fontSize: 11.5 }}>
                            ({nairaAmount(c.per_clean_share_naira)}/clean)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {j.visits_served} / {j.visits_total} served
                  </div>
                  {j.next_visit ? (
                    <div style={{ fontSize: 12.5, color: "#065f46", fontWeight: 600, marginTop: 2 }}>
                      Next: {shortDate(j.next_visit.visit_date)} · {j.next_visit.slot}
                    </div>
                  ) : (
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      No upcoming visits
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ fontSize: 13 }}>
                    <strong>{nairaAmount(j.price_per_clean_naira)}</strong> / clean
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    Supplies: -{nairaAmount(j.supplies_per_visit_naira)} · Inv {nairaAmount(j.invoice_total_naira)}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary-purple)", marginTop: 2 }}>
                    70% pool: {nairaAmount(j.cleaner_pool_per_clean_naira)}/clean
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
