import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listCleaners } from "@/domain/cleaner/cleaner-service";
import AdminBar from "../AdminBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["", "ONBOARDING", "ACTIVE", "SUSPENDED", "INACTIVE"];

export default async function AdminCleaners({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/cleaners");

  const cleaners = await listCleaners({ status: searchParams.status, search: searchParams.q });

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="cleaners" />
      <div className="admin-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 className="admin-h1">Cleaner network</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link className="btn-ghost" href="/admin/cleaners/leaderboard">
              🏆 Leaderboard
            </Link>
            <Link className="btn-primary" href="/admin/cleaners/new" style={{ padding: "12px 20px" }}>
              + Onboard cleaner
            </Link>
          </div>
        </div>

        <form className="filters" method="get">
          <select name="status" defaultValue={searchParams.status ?? ""}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "" ? "All statuses" : s}
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
                <th>Cleaner</th>
                <th>Code</th>
                <th>Status</th>
                <th>Availability</th>
                <th>Ready</th>
                <th>Jobs</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {cleaners.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--mid-gray)" }}>
                    No cleaners yet. Onboard your first cleaner.
                  </td>
                </tr>
              )}
              {cleaners.map((c: Record<string, any>) => (
                <tr key={c.id}>
                  <td>
                    <Link className="ref" href={`/admin/cleaners/${c.id}`}>
                      {c.full_name}
                    </Link>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {c.phone_e164}
                    </div>
                  </td>
                  <td>{c.cleaner_code}</td>
                  <td>
                    <span className="pill neutral">{c.account_status}</span>
                  </td>
                  <td>
                    <span
                      className={`pill ${c.availability === "AVAILABLE" ? "ful-cleaner_assigned" : "neutral"}`}
                    >
                      {c.availability}
                    </span>
                  </td>
                  <td>{c.ready ? "✓" : "—"}</td>
                  <td>{c.completed_jobs ?? 0}</td>
                  <td>{c.rating ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
