import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listApplications, ageFromDob } from "@/domain/applicant/applicant-service";
import { APPLICATION_AREAS, APPLICATION_STATUSES } from "@/validation/schemas";
import { lagos } from "../format";
import { STATUS_PILL } from "./status";
import AdminBar from "../AdminBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminApplicants({
  searchParams,
}: {
  searchParams: { status?: string; area?: string; q?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/applicants");

  const applications = await listApplications({
    status: searchParams.status,
    area: searchParams.area,
    search: searchParams.q,
  });

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="applicants" />
      <div className="admin-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 className="admin-h1">Cleanse Pro applicants</h1>
          <a className="btn-ghost" href="/become-a-cleanse-pro" target="_blank" rel="noreferrer">
            View application form ↗
          </a>
        </div>

        <form className="filters" method="get">
          <select name="status" defaultValue={searchParams.status ?? ""}>
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select name="area" defaultValue={searchParams.area ?? ""}>
            <option value="">All areas</option>
            {APPLICATION_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input name="q" placeholder="Search name…" defaultValue={searchParams.q ?? ""} />
          <button type="submit" className="btn-ghost">
            Filter
          </button>
        </form>

        <div className="board">
          <table>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Applied</th>
                <th>Status</th>
                <th>Area</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Experience</th>
                <th>Days</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--mid-gray)" }}>
                    No applications yet. Share cleanse.ng/become-a-cleanse-pro to start receiving them.
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
                  <td>{lagos(a.created_at)}</td>
                  <td>
                    <span className={`pill ${STATUS_PILL[a.status] ?? "neutral"}`}>{a.status}</span>
                  </td>
                  <td>{a.area}</td>
                  <td>{ageFromDob(a.date_of_birth)}</td>
                  <td>{a.gender}</td>
                  <td>{a.experience}</td>
                  <td>{(a.available_days ?? []).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
