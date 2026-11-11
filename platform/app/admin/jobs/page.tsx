import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listInvoiceJobs } from "@/domain/job/invoice-job-service";
import { JOB_STATUSES } from "@/domain/job/pricing";
import AdminBar from "../AdminBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function naira(n: number): string {
  return `₦${Math.round(n || 0).toLocaleString("en-NG")}`;
}

function shortDate(iso: string): string {
  const dt = new Date(`${iso}T12:00:00Z`);
  if (isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
  }).format(dt);
}

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "pay-success",
  PENDING: "pay-pending",
  PAUSED: "ful-unassigned",
  ENDED: "neutral",
  TERMINATED: "pay-failed",
};

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/jobs");

  const statusFilter = searchParams.status && (JOB_STATUSES as readonly string[]).includes(searchParams.status)
    ? searchParams.status
    : undefined;
  const search = searchParams.q || undefined;

  const { schemaReady, jobs } = await listInvoiceJobs({
    status: statusFilter,
    search,
  });

  const activeCount = jobs.filter((j) => j.status === "ACTIVE").length;
  const scheduledTotal = jobs.reduce((s, j) => s + (j.status === "ACTIVE" ? j.visits_scheduled : 0), 0);
  const totalUnpaidEarned = jobs.reduce((s, j) => s + j.unpaid_earned_naira, 0);

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="jobs" />
      <div className="admin-wrap">
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 className="admin-h1">Jobs &amp; Subscriptions</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Created automatically from every saved invoice. Shows client contact, serving schedule,
              assigned Cleanse Pros (up to 2), price per clean, internal supplies, and 70% cut.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn-ghost" href="/admin/payouts">
              Payouts Desk →
            </Link>
            <Link className="btn-primary" href="/admin/invoices/new" style={{ padding: "12px 20px" }}>
              + New invoice / job
            </Link>
          </div>
        </div>

        {!schemaReady && (
          <div className="notice error" style={{ marginTop: 16 }}>
            Database migration <code>0015_jobs_and_payouts.sql</code> has not been applied yet. Run it in
            Supabase to start syncing saved invoices into Jobs.
          </div>
        )}

        <div className="stat-row" style={{ marginTop: 18 }}>
          <div className="stat-card">
            <div className="n">{activeCount}</div>
            <div className="l">Active subscriptions</div>
          </div>
          <div className="stat-card">
            <div className="n">{scheduledTotal}</div>
            <div className="l">Upcoming scheduled cleans</div>
          </div>
          <div className="stat-card">
            <div className="n">{naira(totalUnpaidEarned)}</div>
            <div className="l">Unpaid 70% earned on listed jobs</div>
          </div>
        </div>

        <form
          method="get"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18, alignItems: "center" }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginRight: "auto" }}>
            <Link
              href={search ? `/admin/jobs?q=${encodeURIComponent(search)}` : "/admin/jobs"}
              className={!statusFilter ? "btn-primary" : "btn-ghost"}
              style={{ padding: "7px 14px", fontSize: 13 }}
            >
              All
            </Link>
            {JOB_STATUSES.map((st) => {
              const href = search
                ? `/admin/jobs?status=${st}&q=${encodeURIComponent(search)}`
                : `/admin/jobs?status=${st}`;
              return (
                <Link
                  key={st}
                  href={href}
                  className={statusFilter === st ? "btn-primary" : "btn-ghost"}
                  style={{ padding: "7px 14px", fontSize: 13 }}
                >
                  {st}
                </Link>
              );
            })}
          </div>
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search invoice #, client, phone, address…"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              minWidth: 240,
              fontSize: 14,
            }}
          />
          <button type="submit" className="btn-ghost" style={{ padding: "8px 14px" }}>
            Filter
          </button>
        </form>

        <div className="board" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Job / Invoice</th>
                <th>Client &amp; Contact</th>
                <th>Status</th>
                <th>Cleanse Pros (max 2)</th>
                <th>Schedule &amp; Served</th>
                <th>Price &amp; 70% Cut</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--mid-gray)" }}>
                    {search || statusFilter
                      ? "No jobs match that filter."
                      : "No jobs yet. Save an invoice to create your first job automatically."}
                  </td>
                </tr>
              )}
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <Link className="ref" href={`/admin/jobs/${j.id}`}>
                      {j.invoice_number}
                    </Link>
                    <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>
                      {j.service_name}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {j.property_bedrooms}BR · {j.billing === "monthly" ? `${j.sessions_count} sessions/mo` : "One-off"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{j.client_name || "Unnamed client"}</div>
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
                    <span className={`pill ${STATUS_CLASS[j.status] ?? "neutral"}`}>{j.status}</span>
                    {j.suggested_end && (
                      <div style={{ marginTop: 4 }}>
                        <span className="pill ful-unassigned" style={{ fontSize: 10 }}>
                          Contract ended
                        </span>
                      </div>
                    )}
                    {j.contract_start && (
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                        {shortDate(j.contract_start)}
                        {j.contract_end && j.contract_end !== j.contract_start ? ` – ${shortDate(j.contract_end)}` : ""}
                      </div>
                    )}
                  </td>
                  <td>
                    {j.cleaners.length === 0 ? (
                      <span className="muted" style={{ fontSize: 12.5 }}>
                        Unassigned
                      </span>
                    ) : (
                      <div style={{ display: "grid", gap: 4 }}>
                        {j.cleaners.map((c) => (
                          <div key={c.cleaner_id} style={{ fontSize: 13 }}>
                            <strong>{c.full_name}</strong>{" "}
                            <span className="muted" style={{ fontSize: 11.5 }}>
                              ({naira(c.per_clean_share_naira)}/clean)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {j.visits_served} / {j.visits_total} served
                    </div>
                    {j.next_visit ? (
                      <div style={{ fontSize: 12.5, color: "#2f6b00", marginTop: 2 }}>
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
                      <strong>{naira(j.price_per_clean_naira)}</strong> / clean
                    </div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      Supplies: -{naira(j.supplies_per_visit_naira)} · Inv {naira(j.invoice_total_naira)}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary-purple)", marginTop: 2 }}>
                      70% pool: {naira(j.cleaner_pool_per_clean_naira)}/clean
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

