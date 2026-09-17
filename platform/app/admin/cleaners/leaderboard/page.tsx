import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getLeaderboard } from "@/domain/cleaner/cleaner-service";
import AdminBar from "../../AdminBar";

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
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="cleaners" />
      <div className="admin-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 className="admin-h1">Cleaner leaderboard</h1>
          <Link className="btn-ghost" href="/admin/cleaners">
            ← All cleaners
          </Link>
        </div>
        <p className="muted">
          Ranked by a blended priority score (rating + completion − cancellations). Higher-reputation
          cleaners are offered jobs first; recent workload still spreads jobs so newer good cleaners
          get a fair shot.
        </p>

        <div className="board">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cleaner</th>
                <th>Status</th>
                <th>Score</th>
                <th>Jobs</th>
                <th>Rating</th>
                <th>Completion</th>
                <th>Cancellation</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "var(--mid-gray)" }}>
                    No cleaners yet.
                  </td>
                </tr>
              )}
              {rows.map((c: Record<string, any>, i: number) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{i + 1}</td>
                  <td>
                    <Link className="ref" href={`/admin/cleaners/${c.id}`}>
                      {c.full_name}
                    </Link>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {c.cleaner_code}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`pill ${
                        c.account_status === "ACTIVE"
                          ? "ful-cleaner_assigned"
                          : c.account_status === "SUSPENDED"
                            ? "ful-exception"
                            : "neutral"
                      }`}
                    >
                      {c.account_status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{c.priority_score}</td>
                  <td>{c.completed_jobs ?? 0}</td>
                  <td>{c.rating ?? "—"}</td>
                  <td>{pct(c.completion_rate)}</td>
                  <td>{pct(c.cancellation_rate)}</td>
                  <td className={c.issues > 0 ? "sla-warn" : ""}>{c.issues}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
