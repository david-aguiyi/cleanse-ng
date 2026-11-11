import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getCleanerAdmin } from "@/domain/cleaner/cleaner-service";
import { getCleanerEarningsSummary } from "@/domain/payout/payout-service";
import { AppError } from "@/http/errors";
import AdminBar from "../../AdminBar";
import ManageCleaner from "./ManageCleaner";
import CleanerCredentials from "./CleanerCredentials";
import PayoutActions from "../../payouts/PayoutActions";

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
    c = await getCleanerAdmin(params.id, admin);
  } catch (err) {
    if (err instanceof AppError && err.code === "CLEANER_NOT_FOUND") notFound();
    throw err;
  }
  const earnings = await getCleanerEarningsSummary(params.id);

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
          {c.work_rate_label === "UNDER_SUPERVISION" && (
            <span className="pill" style={{ background: "#fef3c7", color: "#92400e", fontWeight: 700, border: "1px solid #fde68a" }}>
              ⚠️ Under supervision
            </span>
          )}
          {c.work_rate_label === "FIRED" && (
            <span className="pill" style={{ background: "#fee2e2", color: "#991b1b", fontWeight: 700, border: "1px solid #fecaca" }}>
              ⛔ Fired
            </span>
          )}
          {c.work_rate_label && c.work_rate_label !== "UNDER_SUPERVISION" && c.work_rate_label !== "FIRED" && (
            <span className="pill" style={{ background: "#e0e7ff", color: "#3730a3", fontWeight: 700 }}>
              🏷️ {c.work_rate_label}
            </span>
          )}
          <span className={`pill ${c.ready ? "ful-cleaner_assigned" : "ful-unassigned"}`}>
            {c.ready ? "Deployment ready" : "Not ready"}
          </span>
          <span className={`pill ${c.availability === "AVAILABLE" ? "ful-cleaner_assigned" : "neutral"}`}>
            {c.availability}
          </span>
        </div>

        {c.block_reason && (
          <div className="notice error" style={{ margin: "10px 0" }}>
            <strong>Termination / Suspension details:</strong> {c.block_reason}
          </div>
        )}

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
            <CleanerCredentials
              cleanerId={c.id}
              email={c.email ?? null}
              initialPassword={c.temporary_password ?? null}
              storageReady={c.credentials_storage_ready ?? true}
              canManagePassword={admin.role === "SUPER_ADMIN" || admin.role === "OPERATIONS"}
            />
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

            <h3 style={{ marginTop: 18 }}>Bank Account &amp; Monthly Payout</h3>
            {!earnings.schemaReady ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Run migration <code>0015_jobs_and_payouts.sql</code> to enable bank &amp; payout tracking.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div className="kv">
                  <span className="k">Unpaid Owed Balance</span>
                  <strong>₦{earnings.unpaidTotalNaira.toLocaleString("en-NG")} ({earnings.unpaidCount} cleans)</strong>
                </div>
                <PayoutActions
                  cleanerId={c.id}
                  cleanerName={c.full_name}
                  bankAccount={earnings.bankAccount}
                  unpaidTotalNaira={earnings.unpaidTotalNaira}
                  unpaidCount={earnings.unpaidCount}
                  unpaidByMonth={earnings.unpaidByMonth}
                  todayIso={earnings.todayIso}
                />
                {earnings.payouts.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Recent Paid Settlements</div>
                    {earnings.payouts.slice(0, 5).map((p) => (
                      <div key={p.id} className="kv" style={{ fontSize: 12.5 }}>
                        <span>{p.period_key === "all" ? `Through ${p.cutoff_date}` : p.period_key} · {p.earning_count} cleans</span>
                        <strong>₦{p.total_amount_naira.toLocaleString("en-NG")} Paid</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3>Manage</h3>
            <ManageCleaner
              cleaner={{
                id: c.id,
                account_status: c.account_status,
                verified: c.verified,
                deployment_ready: c.deployment_ready,
                work_rate_label: c.work_rate_label,
                block_reason: c.block_reason,
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
