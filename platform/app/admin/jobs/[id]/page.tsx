import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getInvoiceJob } from "@/domain/job/invoice-job-service";
import { AppError } from "@/http/errors";
import AdminShell from "../../_components/AdminShell";
import StatusBadge from "../../_components/StatusBadge";
import { humanJobStatus, nairaAmount, shortDate } from "../../format";
import ManageInvoiceJob from "./ManageInvoiceJob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const netPerClean = Math.max(
    0,
    Number(job.price_per_clean_naira) - Number(job.supplies_per_visit_naira)
  );
  const servedCount = visits.filter((v) => v.status === "SERVED").length;
  const nextScheduledVisit = visits.find((v) => v.status === "SCHEDULED");

  let bannerTone: "red" | "amber" | "green" | "purple" = "purple";
  let bannerTitle = "Plan Status";
  let bannerDesc = "Review assigned Cleanse Pros and mark each visit Served on cleaning day.";

  if (job.status === "PENDING") {
    bannerTone = "amber";
    bannerTitle = "Next Action: Confirm Payment & Activate Plan";
    bannerDesc =
      "This quote/invoice is currently Awaiting Payment. Change status to Active below once the client transfers.";
  } else if (job.status === "ACTIVE" && cleaners.length === 0) {
    bannerTone = "red";
    bannerTitle = "Next Action: Assign 1–2 Cleanse Pros";
    bannerDesc =
      "No Cleanse Pro is assigned yet. Select up to 2 onboarded Pros below so the job shows up on their /pro portal.";
  } else if (job.suggested_end) {
    bannerTone = "amber";
    bannerTitle = "Next Action: Contract Dates Finished";
    bannerDesc = `End date was ${shortDate(job.contract_end)}. Mark this job Completed below or edit/renew the invoice.`;
  } else if (job.status === "ACTIVE" && nextScheduledVisit) {
    bannerTone = "green";
    bannerTitle = `Active Plan · ${cleaners.length} Pro${cleaners.length > 1 ? "s" : ""} Assigned`;
    bannerDesc = `Next scheduled clean: ${shortDate(nextScheduledVisit.visit_date)} (${nextScheduledVisit.slot}). Mark Served after completion.`;
  } else {
    bannerTone = "purple";
    bannerTitle = `${humanJobStatus(job.status).label} · ${servedCount} of ${visits.length} visits served`;
    bannerDesc = "You can adjust status, team, or review completed earnings below.";
  }

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="jobs"
      breadcrumbs={[
        { label: "Jobs & Visits", href: "/admin/jobs" },
        { label: `${job.invoice_number} · ${job.client_name || "Client Job"}` },
      ]}
      title={`${job.invoice_number} · ${job.client_name || "Client Job"}`}
      subtitle={`${job.service_name} · ${job.property_bedrooms} Bedrooms · ${
        job.billing === "monthly"
          ? `${job.sessions_count} sessions/mo (${job.frequency ?? "Monthly"})`
          : "One-off visit"
      }`}
      actions={
        <>
          <StatusBadge status={humanJobStatus(job.status)} />
          <Link className="ops-quick-btn" href="/admin/payouts">
            Payouts Desk
          </Link>
          <Link className="ops-quick-btn is-primary" href={`/admin/invoices/${job.invoice_id}`}>
            Edit Invoice / PDF →
          </Link>
        </>
      }
    >
      <div className={`ops-action-banner tone-${bannerTone}`}>
        <div>
          <div className="ops-action-title">{bannerTitle}</div>
          <div className="ops-action-desc">{bannerDesc}</div>
        </div>
        <div className="ops-action-ctas">
          <Link className="ops-quick-btn" href={`/admin/invoices/${job.invoice_id}`}>
            Open Linked Invoice →
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
              {shortDate(job.contract_start)}
              {job.contract_end && job.contract_end !== job.contract_start
                ? ` → ${shortDate(job.contract_end)}`
                : ""}
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
            <strong>{nairaAmount(job.invoice_total_naira)}</strong>
          </div>
          <div className="kv">
            <span className="k">Price per Cleanse</span>
            <strong>{nairaAmount(job.price_per_clean_naira)}</strong>
          </div>
          <div className="kv">
            <span className="k">
              Internal Supplies ({job.property_bedrooms <= 2 ? "1–2BR ₦800" : "3+ BR ₦1,500"})
            </span>
            <span style={{ color: "#991b1b", fontWeight: 700 }}>
              -{nairaAmount(job.supplies_per_visit_naira)} / visit
            </span>
          </div>
          <div className="kv">
            <span className="k">Net Cleaning Base</span>
            <span>{nairaAmount(netPerClean)} / clean</span>
          </div>
          <div className="kv">
            <span className="k">70% Cleaner Cut (per clean)</span>
            <strong style={{ color: "var(--primary-purple)" }}>
              {nairaAmount(job.cleaner_pool_per_clean_naira)}
            </strong>
          </div>
          <div className="kv">
            <span className="k">Full Plan Cleaner Pool ({job.sessions_count} cleans)</span>
            <strong>{nairaAmount(job.plan_cleaner_cut_naira)}</strong>
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
    </AdminShell>
  );
}
