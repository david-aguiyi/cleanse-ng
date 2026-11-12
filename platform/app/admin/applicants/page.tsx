import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listApplications, ageFromDob } from "@/domain/applicant/applicant-service";
import { APPLICATION_STATUSES } from "@/validation/schemas";
import { humanApplicantStatus, lagos } from "../format";
import { buildApplicantWhatsAppUrl } from "./applicant-message";
import AdminShell from "../_components/AdminShell";
import StatusBadge from "../_components/StatusBadge";
import ClearApplicationsButton from "./ClearApplicationsButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminApplicants({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/applicants");

  const statusFilter =
    searchParams.status && (APPLICATION_STATUSES as readonly string[]).includes(searchParams.status)
      ? searchParams.status
      : "";

  const applications = await listApplications({
    status: statusFilter || undefined,
    search: searchParams.q,
  });

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="applicants"
      breadcrumbs={[{ label: "Applicants" }]}
      title="Cleanse Pro Applicants"
      subtitle="Incoming candidates from cleanse.ng/become-a-cleanse-pro. Shortlist strong fits and invite them to complete /pro/onboard."
      actions={
        <>
          <a className="ops-quick-btn" href="/become-a-cleanse-pro" target="_blank" rel="noreferrer">
            Application Form ↗
          </a>
          <ClearApplicationsButton totalCount={applications.length} />
        </>
      }
    >
      <div className="ops-chips">
        <Link
          href={searchParams.q ? `/admin/applicants?q=${encodeURIComponent(searchParams.q)}` : "/admin/applicants"}
          className={`ops-chip ${statusFilter === "" ? "is-active" : ""}`}
        >
          All Applicants
        </Link>
        {APPLICATION_STATUSES.map((s) => {
          const href = `/admin/applicants?status=${s}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""}`;
          return (
            <Link key={s} href={href} className={`ops-chip ${statusFilter === s ? "is-active" : ""}`}>
              {humanApplicantStatus(s).label}
            </Link>
          );
        })}
      </div>

      <form className="filters" method="get">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <input name="q" placeholder="Search name or address…" defaultValue={searchParams.q ?? ""} />
        <button type="submit" className="btn-ghost">
          Search
        </button>
      </form>

      <div className="board">
        <table>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Status</th>
              <th>Area &amp; Address</th>
              <th>Profile (Age · Exp · Days)</th>
              <th>Applied</th>
              <th>Outreach</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--mid-gray)" }}>
                  No applications match that filter. Share cleanse.ng/become-a-cleanse-pro to receive candidates.
                </td>
              </tr>
            )}
            {applications.map((a: Record<string, any>) => (
              <tr key={a.id}>
                <td>
                  <Link className="ref" href={`/admin/applicants/${a.id}`}>
                    {a.full_name}
                  </Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {a.whatsapp_e164}
                  </div>
                </td>
                <td>
                  <StatusBadge status={humanApplicantStatus(a.status)} />
                </td>
                <td style={{ maxWidth: 260 }}>{a.area}</td>
                <td style={{ fontSize: 13 }}>
                  <strong>{ageFromDob(a.date_of_birth)} yrs</strong> · {a.gender}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {a.experience} · {(a.available_days ?? []).length} days/wk
                  </div>
                </td>
                <td>{lagos(a.created_at)}</td>
                <td>
                  <a
                    href={buildApplicantWhatsAppUrl(a.whatsapp_e164, a.full_name)}
                    target="_blank"
                    rel="noreferrer"
                    className="ops-quick-btn"
                    style={{ padding: "5px 11px", fontSize: 12 }}
                  >
                    WhatsApp ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
