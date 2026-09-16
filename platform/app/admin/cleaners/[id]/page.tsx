import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getCleanerAdmin } from "@/domain/cleaner/cleaner-service";
import { AppError } from "@/http/errors";
import AdminBar from "../../AdminBar";
import ManageCleaner from "./ManageCleaner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pct(v: number | null): string {
  return v === null || v === undefined ? "—" : `${Number(v)}%`;
}

export default async function CleanerDetail({ params }: { params: { id: string } }) {
  const admin = await getAdminContext();
  if (!admin) redirect(`/admin/login?next=/admin/cleaners/${params.id}`);

  let c;
  try {
    c = await getCleanerAdmin(params.id);
  } catch (err) {
    if (err instanceof AppError && err.code === "CLEANER_NOT_FOUND") notFound();
    throw err;
  }

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="cleaners" />
      <div className="admin-wrap">
        <p className="muted">
          <Link href="/admin/cleaners">← Cleaner network</Link>
        </p>
        <h1 className="admin-h1">{c.full_name}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0" }}>
          <span className="pill neutral">{c.cleaner_code}</span>
          <span className="pill neutral">{c.account_status}</span>
          <span className={`pill ${c.ready ? "ful-cleaner_assigned" : "ful-unassigned"}`}>
            {c.ready ? "Deployment ready" : "Not ready"}
          </span>
          <span className={`pill ${c.availability === "AVAILABLE" ? "ful-cleaner_assigned" : "neutral"}`}>
            {c.availability}
          </span>
        </div>

        <div className="detail-grid">
          <div className="card">
            <h3>Profile</h3>
            <div className="kv">
              <span className="k">Phone</span>
              <span>{c.phone_e164}</span>
            </div>
            <div className="kv">
              <span className="k">WhatsApp</span>
              <span>{c.whatsapp_e164 ?? "—"}</span>
            </div>
            <div className="kv">
              <span className="k">Email</span>
              <span>{c.email ?? "—"}</span>
            </div>
            {c.bio && (
              <div className="kv">
                <span className="k">Bio</span>
                <span style={{ textAlign: "right" }}>{c.bio}</span>
              </div>
            )}

            <h3 style={{ marginTop: 16 }}>Performance</h3>
            <div className="cleaner-stats">
              <div className="stat-box">
                <div className="num">{c.completed_jobs ?? 0}</div>
                <div className="cap">Jobs</div>
              </div>
              <div className="stat-box">
                <div className="num">{c.rating ?? "—"}</div>
                <div className="cap">Rating</div>
              </div>
              <div className="stat-box">
                <div className="num">{pct(c.acceptance_rate)}</div>
                <div className="cap">Accept</div>
              </div>
              <div className="stat-box">
                <div className="num">{pct(c.completion_rate)}</div>
                <div className="cap">Complete</div>
              </div>
              <div className="stat-box">
                <div className="num">{pct(c.cancellation_rate)}</div>
                <div className="cap">Cancel</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Manage</h3>
            <ManageCleaner
              cleaner={{
                id: c.id,
                account_status: c.account_status,
                verified: c.verified,
                deployment_ready: c.deployment_ready,
                zones: c.zones,
                services: c.services,
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
