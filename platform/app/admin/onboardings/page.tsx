import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listOnboardings } from "@/domain/cleaner/onboarding-service";
import AdminShell from "../_components/AdminShell";
import StatusBadge from "../_components/StatusBadge";
import { humanOnboardingStatus, lagos } from "../format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILTER_TABS = [
  { id: "", label: "All Submissions" },
  { id: "SUBMITTED", label: "Needs Review" },
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
] as const;

export default async function AdminOnboardings({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/onboardings");

  const statusFilter = FILTER_TABS.some((t) => t.id === (searchParams.status ?? ""))
    ? (searchParams.status ?? "")
    : "";

  const rows = await listOnboardings({
    status: statusFilter || undefined,
    search: searchParams.q,
  });

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="onboardings"
      breadcrumbs={[{ label: "Onboarding & NIN" }]}
      title={`Onboarding & NIN Verification (${rows.length})`}
      subtitle="Submissions from /pro/onboard. Verify identity photo & NIN, call the guarantor, then approve to create the Pro account."
      actions={
        <Link href="/pro/onboard" target="_blank" rel="noreferrer" className="ops-quick-btn">
          Open /pro/onboard Form ↗
        </Link>
      }
    >
      <div className="ops-chips">
        {FILTER_TABS.map((tab) => {
          const isCurrent = statusFilter === tab.id;
          const href =
            tab.id === ""
              ? searchParams.q
                ? `/admin/onboardings?q=${encodeURIComponent(searchParams.q)}`
                : "/admin/onboardings"
              : `/admin/onboardings?status=${tab.id}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""}`;
          return (
            <Link key={tab.id || "ALL"} href={href} className={`ops-chip ${isCurrent ? "is-active" : ""}`}>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      <form className="filters" method="get">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <input name="q" placeholder="Search name, phone, or NIN…" defaultValue={searchParams.q ?? ""} />
        <button type="submit" className="btn-ghost">
          Search
        </button>
      </form>

      <div className="board">
        <table>
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Status</th>
              <th>NIN Check</th>
              <th>Guarantor Check</th>
              <th>Closest Zone</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--mid-gray)" }}>
                  No Cleanse Pro onboarding submissions match that filter. Share <code>/pro/onboard</code> with accepted applicants.
                </td>
              </tr>
            )}
            {rows.map((r: Record<string, any>) => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {r.photo_url ? (
                      <img
                        src={r.photo_url}
                        alt={r.full_name}
                        style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
                      />
                    ) : (
                      <span style={{ fontSize: 22 }}>👤</span>
                    )}
                    <div>
                      <Link className="ref" href={`/admin/onboardings/${r.id}`}>
                        {r.full_name}
                      </Link>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {r.whatsapp_e164}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <StatusBadge status={humanOnboardingStatus(r.status)} />
                  {r.cleaner_id && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <Link href={`/admin/cleaners/${r.cleaner_id}`}>Open Pro Profile →</Link>
                    </div>
                  )}
                </td>
                <td>
                  <span className="pill neutral" style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {r.nin_digits}
                  </span>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {r.nin_verified ? (
                      <span style={{ color: "#065f46", fontWeight: 700 }}>✓ NIN Verified</span>
                    ) : (
                      <span style={{ color: "#92400e", fontWeight: 600 }}>Pending NIN check</span>
                    )}
                  </div>
                </td>
                <td>
                  {r.guarantor_called ? (
                    <span className="ops-status tone-green">Guarantor Called</span>
                  ) : (
                    <span className="ops-status tone-neutral">Not Called Yet</span>
                  )}
                </td>
                <td>{r.closest_zone}</td>
                <td>{lagos(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
