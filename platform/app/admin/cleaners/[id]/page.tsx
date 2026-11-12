import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getCleanerAdmin } from "@/domain/cleaner/cleaner-service";
import { getCleanerEarningsSummary } from "@/domain/payout/payout-service";
import { AppError } from "@/http/errors";
import AdminShell from "../../_components/AdminShell";
import StatusBadge from "../../_components/StatusBadge";
import { humanCleanerStatus, nairaAmount } from "../../format";
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

  let bannerTone: "green" | "amber" | "red" | "purple" = "green";
  let bannerTitle = "Active & Deployment Ready";
  let bannerDesc = "This Cleanse Pro appears in Invoice Maker dropdowns and can receive job assignments.";

  if (c.account_status === "SUSPENDED") {
    bannerTone = "red";
    bannerTitle = "Account Blocked";
    bannerDesc = c.block_reason || "This Pro is currently suspended and cannot be assigned to new jobs.";
  } else if (!c.ready || c.account_status === "ONBOARDING") {
    bannerTone = "amber";
    bannerTitle = "Next Action: Complete Activation & Verification";
    bannerDesc =
      "Mark as Verified & Deployment Ready and set Status to Active on the right so they can take jobs.";
  } else if (earnings.schemaReady && earnings.unpaidTotalNaira > 0 && !earnings.bankAccount) {
    bannerTone = "amber";
    bannerTitle = "Bank Details Missing";
    bannerDesc = `Owes ${nairaAmount(earnings.unpaidTotalNaira)}, but no bank account is saved. Ask this Pro to update /pro/profile.`;
  }

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="cleaners"
      breadcrumbs={[
        { label: "Cleanse Pros", href: "/admin/cleaners" },
        { label: `${c.full_name} (${c.cleaner_code})` },
      ]}
      title={c.full_name}
      subtitle={`${c.cleaner_code} · ${c.phone_e164}`}
      actions={
        <>
          <StatusBadge status={humanCleanerStatus(c.account_status)} />
          <span className={`ops-status ${c.ready ? "tone-green" : "tone-amber"}`}>
            {c.ready ? "Deployment Ready" : "Not Ready"}
          </span>
        </>
      }
    >
      <div className={`ops-action-banner tone-${bannerTone}`}>
        <div>
          <div className="ops-action-title">{bannerTitle}</div>
          <div className="ops-action-desc">{bannerDesc}</div>
        </div>
        {earnings.schemaReady && earnings.unpaidTotalNaira > 0 && (
          <Link href="/admin/payouts" className="ops-quick-btn">
            Open Payouts Desk →
          </Link>
        )}
      </div>

      {c.block_reason && c.account_status !== "SUSPENDED" && (
        <div className="notice error" style={{ marginBottom: 16 }}>
          <strong>Account Notice:</strong> {c.block_reason}
        </div>
      )}

      <div className="detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <h3>Contact &amp; /pro Portal Credentials</h3>
            <div className="kv">
              <span className="k">Code</span>
              <strong>{c.cleaner_code}</strong>
            </div>
            <div className="kv">
              <span className="k">Phone</span>
              <span>{c.phone_e164}</span>
            </div>
            <div className="kv">
              <span className="k">WhatsApp</span>
              <span>{c.whatsapp_e164 ?? "—"}</span>
            </div>
            <div className="kv">
              <span className="k">Availability</span>
              <span>{c.availability === "AVAILABLE" ? "Available" : c.availability || "—"}</span>
            </div>
            <CleanerCredentials
              cleanerId={c.id}
              email={c.email ?? null}
              initialPassword={c.temporary_password ?? null}
              storageReady={c.credentials_storage_ready ?? true}
              canManagePassword={admin.role === "SUPER_ADMIN" || admin.role === "OPERATIONS"}
            />
            {c.bio && (
              <div className="kv" style={{ marginTop: 8 }}>
                <span className="k">Bio</span>
                <span style={{ textAlign: "right" }}>{c.bio}</span>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Payout Bank Account &amp; 70% Earnings</h3>
            {!earnings.schemaReady ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Run migration <code>0015_jobs_and_payouts.sql</code> to enable bank &amp; payout tracking.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div className="kv">
                  <span className="k">Unpaid Owed Balance</span>
                  <strong>
                    {nairaAmount(earnings.unpaidTotalNaira)} ({earnings.unpaidCount} cleans)
                  </strong>
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
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                      Recent Paid Settlements
                    </div>
                    {earnings.payouts.slice(0, 5).map((p) => (
                      <div key={p.id} className="kv" style={{ fontSize: 12.5 }}>
                        <span>
                          {p.period_key === "all" ? `Through ${p.cutoff_date}` : p.period_key} ·{" "}
                          {p.earning_count} cleans
                        </span>
                        <strong>{nairaAmount(p.total_amount_naira)} Paid</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3>Performance Snapshot</h3>
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
        </div>

        <div className="card" style={{ alignSelf: "start" }}>
          <h3>Status, Verification &amp; Service Areas</h3>
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
    </AdminShell>
  );
}
