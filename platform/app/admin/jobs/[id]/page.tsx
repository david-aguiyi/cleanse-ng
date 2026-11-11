import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getInvoiceJob } from "@/domain/job/invoice-job-service";
import { AppError } from "@/http/errors";
import AdminBar from "../../AdminBar";
import ManageInvoiceJob from "./ManageInvoiceJob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function naira(n: number): string {
  return `₦${Math.round(n || 0).toLocaleString("en-NG")}`;
}

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "pay-success",
  PENDING: "pay-pending",
  PAUSED: "ful-unassigned",
  ENDED: "neutral",
  TERMINATED: "pay-failed",
};

export default async function AdminJobDetailPage({ params }: { params: { id: string } }) {
  const admin = await getAdminContext();
  if (!admin) redirect(`/admin/login?next=/admin/jobs/${params.id}`);

  let data;
  try {
    data = await getInvoiceJob(params.id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const { job, cleaners, visits, selectable_cleaners } = data;
  const netPerClean = Math.max(0, Number(job.price_per_clean_naira) - Number(job.supplies_per_visit_naira));
  const servedCount = visits.filter((v) => v.status === "SERVED").length;

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="jobs" />
      <div className="admin-wrap">
        <p className="muted">
          <Link href="/admin/jobs">← Back to Jobs</Link>
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 className="admin-h1" style={{ margin: 0 }}>
                {job.invoice_number} · {job.client_name || "Client Job"}
              </h1>
              <span className={`pill ${STATUS_CLASS[job.status] ?? "neutral"}`}>{job.status}</span>
              {job.suggested_end && (
                <span className="pill ful-unassigned">Contract ended — Mark Ended or Renew</span>
              )}
            </div>
            <p className="muted" style={{ marginTop: 4 }}>
              {job.service_name} · {job.property_bedrooms} Bedrooms ·{" "}
              {job.billing === "monthly" ? `${job.sessions_count} sessions/mo (${job.frequency ?? "Monthly"})` : "One-off visit"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn-ghost" href="/admin/payouts">
              Payouts Desk
            </Link>
            <Link className="btn-primary" href={`/admin/invoices/${job.invoice_id}`} style={{ padding: "10px 18px" }}>
              Edit Invoice / PDF →
            </Link>
          </div>
        </div>

        <div className="detail-grid" style={{ marginBottom: 20 }}>
          <div className="card">
            <h3>Client &amp; Contract Details (Operator Only)</h3>
            <div className="kv">
              <span className="k">Client</span>
              <span>{job.client_name || "—"}</span>
            </div>
            <div className="kv">
              <span className="k">Client Phone</span>
              <strong>{job.client_phone || "Not entered on invoice"}</strong>
            </div>
            <div className="kv">
              <span className="k">Address</span>
              <span style={{ textAlign: "right" }}>
                {[job.client_address, job.client_area].filter(Boolean).join(" · ") || "—"}
              </span>
            </div>
            <div className="kv">
              <span className="k">Contract Dates</span>
              <span>
                {job.contract_start || "—"}
                {job.contract_end && job.contract_end !== job.contract_start ? ` → ${job.contract_end}` : ""}
              </span>
            </div>
            <div className="kv">
              <span className="k">Materials / Equipment</span>
              <span>
                Materials: {job.materials_by === "client" ? "Client" : "Cleanse.ng"} · Equipment:{" "}
                {job.equipment_by === "cleanse" ? "Cleanse.ng" : "Client"}
              </span>
            </div>
            {job.status_reason && (
              <div className="kv">
                <span className="k">Status Note</span>
                <span style={{ textAlign: "right" }}>{job.status_reason}</span>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Per-Clean Economics &amp; 70% Pool</h3>
            <div className="kv">
              <span className="k">Invoice Total ({job.sessions_count} cleans)</span>
              <strong>{naira(job.invoice_total_naira)}</strong>
            </div>
            <div className="kv">
              <span className="k">Price per Cleanse</span>
              <strong>{naira(job.price_per_clean_naira)}</strong>
            </div>
            <div className="kv">
              <span className="k">
                Internal Supplies ({job.property_bedrooms <= 2 ? "1–2BR ₦800" : "3–5BR ₦1,500"})
              </span>
              <span style={{ color: "#8a1c13", fontWeight: 600 }}>
                -{naira(job.supplies_per_visit_naira)} / visit
              </span>
            </div>
            <div className="kv">
              <span className="k">Net Cleaning Base</span>
              <span>{naira(netPerClean)} / clean</span>
            </div>
            <div className="kv">
              <span className="k">70% Cleaner Cut (per clean)</span>
              <strong style={{ color: "var(--primary-purple)" }}>
                {naira(job.cleaner_pool_per_clean_naira)}
              </strong>
            </div>
            <div className="kv">
              <span className="k">Full Plan Cleaner Pool ({job.sessions_count} cleans)</span>
              <strong>{naira(job.plan_cleaner_cut_naira)}</strong>
            </div>
            <div className="kv">
              <span className="k">Visits Served So Far</span>
              <strong>
                {servedCount} of {visits.length} scheduled
              </strong>
            </div>
          </div>
        </div>

        <ManageInvoiceJob
          jobId={job.id}
          status={job.status}
          cleanerPoolPerClean={Number(job.cleaner_pool_per_clean_naira || 0)}
          assignedCleaners={cleaners}
          selectableCleaners={selectable_cleaners}
          visits={visits}
        />
      </div>
    </main>
  );
}

