import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listCleaners } from "@/domain/cleaner/cleaner-service";
import AdminShell from "../_components/AdminShell";
import StatusBadge from "../_components/StatusBadge";
import CleanseProTabs from "./CleanseProTabs";
import { humanCleanerStatus } from "../format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILTER_TABS = [
  { id: "", label: "All Pros" },
  { id: "ACTIVE", label: "Active" },
  { id: "ONBOARDING", label: "Onboarding" },
  { id: "INACTIVE", label: "Inactive" },
  { id: "SUSPENDED", label: "Blocked" },
] as const;

export default async function AdminCleaners({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/cleaners");

  const statusFilter = FILTER_TABS.some((t) => t.id === (searchParams.status ?? ""))
    ? (searchParams.status ?? "")
    : "";

  const cleaners = await listCleaners({ status: statusFilter || undefined, search: searchParams.q });

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="cleaners"
      breadcrumbs={[{ label: "Cleanse Pros" }]}
      title="Cleanse Pros"
      subtitle="Active roster, deployment readiness, portal credentials, and performance scores."
      actions={
        <Link className="btn-primary" href="/admin/cleaners/new" style={{ padding: "10px 18px" }}>
          + Add Cleanse Pro
        </Link>
      }
    >
      <CleanseProTabs active="all" />

      <div className="ops-action-banner tone-purple" style={{ padding: "10px 16px" }}>
        <div className="ops-action-desc">
          Tip: Candidates who complete the self-onboarding link appear in{" "}
          <Link href="/admin/onboardings" style={{ fontWeight: 700 }}>
            Onboarding &amp; NIN
          </Link>{" "}
          first — approving them there adds them to this roster automatically.
        </div>
      </div>

      <div className="ops-chips">
        {FILTER_TABS.map((tab) => {
          const isCurrent = statusFilter === tab.id;
          const href =
            tab.id === ""
              ? searchParams.q
                ? `/admin/cleaners?q=${encodeURIComponent(searchParams.q)}`
                : "/admin/cleaners"
              : `/admin/cleaners?status=${tab.id}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""}`;
          return (
            <Link key={tab.id || "ALL"} href={href} className={`ops-chip ${isCurrent ? "is-active" : ""}`}>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      <form className="filters" method="get">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <input name="q" placeholder="Search Pro name…" defaultValue={searchParams.q ?? ""} />
        <button type="submit" className="btn-ghost">
          Search
        </button>
      </form>

      <div className="board">
        <table>
          <thead>
            <tr>
              <th>Cleanse Pro</th>
              <th>Status</th>
              <th>Readiness</th>
              <th>Availability</th>
              <th>Jobs Completed</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {cleaners.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--mid-gray)" }}>
                  No Cleanse Pros match that filter yet.
                </td>
              </tr>
            )}
            {cleaners.map((c: Record<string, any>) => (
              <tr key={c.id}>
                <td>
                  <Link className="ref" href={`/admin/cleaners/${c.id}`}>
                    {c.full_name}
                  </Link>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {c.cleaner_code} · {c.phone_e164}
                  </div>
                  {c.work_rate_label === "UNDER_SUPERVISION" && (
                    <span className="ops-status tone-amber" style={{ marginTop: 4, fontSize: 11 }}>
                      Under Supervision
                    </span>
                  )}
                  {c.work_rate_label === "FIRED" && (
                    <span className="ops-status tone-red" style={{ marginTop: 4, fontSize: 11 }}>
                      Fired
                    </span>
                  )}
                  {c.work_rate_label &&
                    c.work_rate_label !== "UNDER_SUPERVISION" &&
                    c.work_rate_label !== "FIRED" && (
                      <span className="ops-status tone-purple" style={{ marginTop: 4, fontSize: 11 }}>
                        {c.work_rate_label}
                      </span>
                    )}
                </td>
                <td>
                  <StatusBadge status={humanCleanerStatus(c.account_status)} />
                </td>
                <td>
                  {c.ready ? (
                    <span className="ops-status tone-green">Ready for Jobs</span>
                  ) : (
                    <span className="ops-status tone-amber">Needs Verification</span>
                  )}
                </td>
                <td>
                  <span
                    className={`ops-status ${
                      c.availability === "AVAILABLE" ? "tone-green" : "tone-neutral"
                    }`}
                  >
                    {c.availability === "AVAILABLE" ? "Available" : c.availability || "Off"}
                  </span>
                </td>
                <td>
                  <strong>{c.completed_jobs ?? 0}</strong>
                </td>
                <td>{c.rating ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
