import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listOnboardings } from "@/domain/cleaner/onboarding-service";
import { lagos } from "../format";
import AdminBar from "../AdminBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"];

export default async function AdminOnboardings({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/onboardings");

  const rows = await listOnboardings({
    status: searchParams.status,
    search: searchParams.q,
  });

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="onboardings" />
      <div className="admin-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="admin-h1">Pro onboardings ({rows.length})</h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Public onboarding URL:{" "}
              <Link href="/pro/onboard" target="_blank" rel="noreferrer">
                /pro/onboard ↗
              </Link>
            </p>
          </div>
          <Link href="/admin/cleaners" className="btn-ghost">
            ← Cleaner network
          </Link>
        </div>

        <form className="filters" method="get" style={{ marginTop: 14 }}>
          <select name="status" defaultValue={searchParams.status ?? ""}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "" ? "All statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input name="q" placeholder="Search name, phone, or NIN…" defaultValue={searchParams.q ?? ""} />
          <button type="submit" className="btn-ghost">
            Filter
          </button>
        </form>

        <div className="board">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Submitted</th>
                <th>Zone</th>
                <th>NIN</th>
                <th>Guarantor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--mid-gray)" }}>
                    No Cleanse Pro onboarding submissions yet. Share <code>/pro/onboard</code> with accepted applicants.
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
                          style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: 24 }}>👤</span>
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
                  <td>{lagos(r.created_at)}</td>
                  <td>{r.closest_zone}</td>
                  <td>
                    <span className="pill neutral" style={{ fontFamily: "monospace", fontSize: 11 }}>
                      {r.nin_digits}
                    </span>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      {r.nin_verified ? (
                        <span style={{ color: "#059669", fontWeight: 700 }}>✓ NIN Verified</span>
                      ) : (
                        <span className="muted">Pending check</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {r.guarantor_called ? (
                      <span className="pill" style={{ background: "#d1fae5", color: "#065f46" }}>
                        ✓ Called
                      </span>
                    ) : (
                      <span className="pill neutral">Not called</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`pill ${
                        r.status === "APPROVED"
                          ? "ful-cleaner_assigned"
                          : r.status === "REJECTED"
                          ? "ful-unassigned"
                          : "neutral"
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.cleaner_id && (
                      <div style={{ fontSize: 11, marginTop: 4 }}>
                        <Link href={`/admin/cleaners/${r.cleaner_id}`}>Cleaner profile ➔</Link>
                      </div>
                    )}
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

