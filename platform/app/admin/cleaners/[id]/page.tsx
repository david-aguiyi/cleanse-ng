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
              {c.whatsapp_e164 ? (
                <a
                  href={`https://wa.me/${String(c.whatsapp_e164).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#047857",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                  title="Chat on WhatsApp"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.49 0 .15 5.34.15 11.91c0 2.1.55 4.15 1.59 5.96L0 24l6.29-1.65a11.87 11.87 0 0 0 5.77 1.47h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.46-8.43Zm-8.46 18.33h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.73.98 1-3.64-.24-.37a9.85 9.85 0 0 1-1.51-5.28C2.18 6.45 6.61 2.02 12.06 2.02c2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.9-9.89 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
                  </svg>
                  <span>{c.whatsapp_e164} ↗</span>
                </a>
              ) : (
                <span>—</span>
              )}
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
                Payout tracking is not enabled in this environment yet. Ask the technical owner to enable it.
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
                  unpaidEarnings={earnings.unpaidEarnings}
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
                <div className="num">
                  {Math.max(
                    c.completed_jobs ?? 0,
                    earnings.unpaidCount + earnings.payouts.reduce((sum, p) => sum + p.earning_count, 0)
                  )}
                </div>
                <div className="cap">Cleans Served</div>
              </div>
              <div className="stat-box">
                <div className="num">{nairaAmount(earnings.unpaidTotalNaira)}</div>
                <div className="cap">Unpaid Owed</div>
              </div>
              <div className="stat-box">
                <div className="num">{nairaAmount(earnings.paidTotalAllTimeNaira)}</div>
                <div className="cap">Total Paid</div>
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
