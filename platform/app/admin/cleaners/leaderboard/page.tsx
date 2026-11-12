import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getLeaderboard } from "@/domain/cleaner/cleaner-service";
import AdminShell from "../../_components/AdminShell";
import StatusBadge from "../../_components/StatusBadge";
import CleanseProTabs from "../CleanseProTabs";
import { humanCleanerStatus } from "../../format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pct(v: number | null): string {
  return v === null || v === undefined ? "—" : `${Number(v)}%`;
}

export default async function LeaderboardPage() {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/cleaners/leaderboard");

  const rows = await getLeaderboard();

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="cleaners"
      breadcrumbs={[
        { label: "Cleanse Pros", href: "/admin/cleaners" },
        { label: "Leaderboard & Scores" },
      ]}
      title="Cleanse Pro Leaderboard"
      subtitle="Ranked by blended reputation score (rating + completion rate minus cancellations) so top Pros stand out at a glance."
    >
      <CleanseProTabs active="leaderboard" />

      <div className="board">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Cleanse Pro</th>
              <th>Status</th>
              <th>Priority Score</th>
              <th>Jobs</th>
              <th>Rating</th>
              <th>Completion / Cancel</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 36, color: "var(--mid-gray)" }}>
                  No Cleanse Pros yet.
                </td>
              </tr>
            )}
            {rows.map((c: Record<string, any>, i: number) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 800, color: "var(--deep-purple)" }}>{i + 1}</td>
                <td>
                  <Link className="ref" href={`/admin/cleaners/${c.id}`}>
                    {c.full_name}
                  </Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {c.cleaner_code}
                  </div>
                </td>
                <td>
                  <StatusBadge status={humanCleanerStatus(c.account_status)} />
                </td>
                <td style={{ fontWeight: 800, color: "var(--primary-purple)" }}>{c.priority_score}</td>
                <td>{c.completed_jobs ?? 0}</td>
                <td>{c.rating ?? "—"}</td>
                <td>
                  {pct(c.completion_rate)} complete · {pct(c.cancellation_rate)} cancel
                </td>
                <td className={c.issues > 0 ? "sla-warn" : ""}>{c.issues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
