import { redirect } from "next/navigation";
import { getCleanerContext } from "@/auth/cleaner";
import { getMe } from "@/domain/cleaner/cleaner-service";
import { listOffers } from "@/domain/assignment/assignment-service";
import { listActiveJobs } from "@/domain/job/job-service";
import { listCleanerProSchedule } from "@/domain/job/invoice-job-service";
import { getCleanerEarningsSummary } from "@/domain/payout/payout-service";
import ProBar from "../ProBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function koboToNaira(kobo: number): string {
  return `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;
}

function naira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

function formatVisitDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)));
}

export default async function ProHomePage() {
  const ctx = await getCleanerContext();
  if (!ctx) redirect("/pro/login?next=/pro/home");

  const [me, offers, activeJobs, schedule, earnings] = await Promise.all([
    getMe(ctx.cleanerId),
    listOffers(ctx.cleanerId),
    listActiveJobs(ctx.cleanerId),
    listCleanerProSchedule(ctx.cleanerId),
    getCleanerEarningsSummary(ctx.cleanerId),
  ]);

  const activeOffers = offers.filter((o) => o.is_active);
  const { nextVisit, upcomingVisits, assignedJobs } = schedule;

  return (
    <main className="cleaner-shell">
      <ProBar active="home" />
      <div className="cleaner-wrap">
        <h1 className="step-title" style={{ fontSize: 20 }}>
          Hi {me.full_name.split(" ")[0]}
        </h1>

        {!me.ready ? (
          <div className="readiness blocked">
            <strong>Account status: {me.account_status}.</strong> An operator will verify and activate
            your Cleanse Pro profile before scheduling jobs to you.
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              <li>Verified: {me.verified ? "Yes" : "No"}</li>
              <li>Deployment ready: {me.deployment_ready ? "Yes" : "No"}</li>
            </ul>
          </div>
        ) : (
          <div className="readiness ready">
            <strong>Cleanse Pro Active.</strong> Jobs and scheduled cleaning days assigned to you by
            the Cleanse office appear below automatically.
          </div>
        )}

        {earnings.schemaReady && !earnings.bankAccount && (
          <a
            href="/pro/profile#bank"
            className="card"
            style={{
              display: "block",
              textDecoration: "none",
              marginBottom: 18,
              borderColor: "#d97706",
              background: "#fffbeb",
            }}
          >
            <strong style={{ color: "#92400e", display: "block", marginBottom: 4 }}>
              Add your bank account for payouts
            </strong>
            <span className="muted" style={{ fontSize: 13 }}>
              Save your account number, bank name, and account name on your profile so Cleanse can settle
              your 70% monthly payout.
            </span>
          </a>
        )}

        {/* Next scheduled day & timing highlight */}
        {nextVisit ? (
          <div
            className="card"
            style={{
              marginBottom: 18,
              border: "2px solid var(--neon-green)",
              background: "linear-gradient(180deg, #f9fff0 0%, #ffffff 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className="pill ful-cleaner_assigned">Next Scheduled Clean</span>
              <strong style={{ color: "#2f6b00", fontSize: 16 }}>{naira(nextVisit.your_cut_naira)} cut</strong>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-header)",
                color: "var(--deep-purple)",
                fontSize: 18,
                margin: "10px 0 4px",
              }}
            >
              {formatVisitDay(nextVisit.visit_date)} · {nextVisit.slot}
            </h2>
            <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              {nextVisit.service_name} · {nextVisit.property_bedrooms}BR · Plan {nextVisit.invoice_number}
            </div>
            <div className="kv">
              <span className="k">Client</span>
              <span>{nextVisit.client_name ?? "Cleanse Client"}</span>
            </div>
            <div className="kv">
              <span className="k">Area</span>
              <span>{nextVisit.client_area ?? "Confirmed by ops"}</span>
            </div>
            <div className="kv">
              <span className="k">House Details</span>
              <span style={{ textAlign: "right" }}>
                {nextVisit.address_unlocked && nextVisit.client_address ? (
                  <strong>{nextVisit.client_address}</strong>
                ) : (
                  <span className="muted">
                    Hidden until {nextVisit.unlock_label} (1 hr before clean)
                  </span>
                )}
              </span>
            </div>
            <div className="kv">
              <span className="k">Supplies</span>
              <span>
                {nextVisit.materials_by === "cleanse" ? "Provided by Cleanse" : "Client provides supplies"}
              </span>
            </div>
            {nextVisit.co_cleaner_name && (
              <div className="kv">
                <span className="k">Working With</span>
                <span>{nextVisit.co_cleaner_name}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>Next scheduled clean</h3>
            <p className="muted" style={{ margin: 0 }}>
              No upcoming invoice visits assigned right now. When Cleanse ops assigns you to a plan, your
              upcoming days and arrival times will appear here.
            </p>
          </div>
        )}

        {/* Coming scheduled days list */}
        {upcomingVisits.length > 0 && (
          <div className="card" style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>
              Coming Scheduled Days ({upcomingVisits.length})
            </h3>
            <div style={{ display: "grid", gap: 10 }}>
              {upcomingVisits.slice(0, 14).map((v) => (
                <div
                  key={v.visit_id}
                  style={{
                    borderTop: "1px solid var(--border, #e5e7eb)",
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--deep-purple)", fontSize: 14 }}>
                      {formatVisitDay(v.visit_date)} · {v.slot}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {v.service_name} ({v.property_bedrooms}BR) ·{" "}
                      {v.address_unlocked && v.client_address
                        ? `${v.client_address}${v.client_area ? `, ${v.client_area}` : ""}`
                        : v.client_area ?? "Area confirmed"}
                      {v.co_cleaner_name ? ` · w/ ${v.co_cleaner_name}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <strong style={{ color: "#2f6b00", fontSize: 13 }}>{naira(v.your_cut_naira)}</strong>
                    <div className="muted" style={{ fontSize: 11 }}>{v.invoice_number}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned cleaning plans */}
        {assignedJobs.length > 0 && (
          <div className="card" style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>
              Your Assigned Plans ({assignedJobs.length})
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {assignedJobs.map((j) => (
                <div
                  key={j.job_id}
                  style={{
                    borderTop: "1px solid var(--border, #e5e7eb)",
                    paddingTop: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong style={{ color: "var(--deep-purple)", fontFamily: "var(--font-header)" }}>
                      {j.client_name ?? "Cleanse Client"} · {j.service_name} ({j.property_bedrooms}BR)
                    </strong>
                    <span className="pill ful-cleaner_assigned">{j.invoice_number}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {j.address_unlocked && j.client_address
                      ? [j.client_address, j.client_area].filter(Boolean).join(", ")
                      : `${j.client_area ?? "Area confirmed by ops"} · Exact house details unlock 1 hr before clean`}
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {j.frequency || j.billing} · Your cut: <strong>{naira(j.your_cut_per_clean_naira)}/clean</strong>
                    {j.co_cleaner_name ? ` · Team w/ ${j.co_cleaner_name}` : ""}
                    {` · ${j.upcoming_visits.length} scheduled visit${j.upcoming_visits.length === 1 ? "" : "s"}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unpaid earnings & payout link */}
        {earnings.schemaReady && (
          <a
            href="/pro/profile"
            className="card"
            style={{ display: "block", textDecoration: "none", marginBottom: 18 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 15, marginBottom: 4 }}>Your Unpaid Payout Balance (70% cut)</h3>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {earnings.unpaidCount} served clean{earnings.unpaidCount === 1 ? "" : "s"} awaiting settlement
                  {" · "}
                  {earnings.bankAccount
                    ? `${earnings.bankAccount.bank_name} (${earnings.bankAccount.account_number})`
                    : "Tap to add bank details"}
                </p>
              </div>
              <strong style={{ fontSize: 18, color: "#2f6b00", whiteSpace: "nowrap" }}>
                {naira(earnings.unpaidTotalNaira)}
              </strong>
            </div>
          </a>
        )}

        {/* Online /book active jobs & offers (when dispatched) */}
        {activeJobs.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>
              Active Online Job{activeJobs.length > 1 ? "s" : ""}
            </h3>
            {activeJobs.map((j) => (
              <a
                key={j.booking_reference}
                href={`/pro/jobs/${j.booking_reference}`}
                className="card"
                style={{ display: "block", textDecoration: "none", marginBottom: 10 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ color: "var(--deep-purple)", fontFamily: "var(--font-header)" }}>
                    {j.service_name}
                  </strong>
                  <span className="pill ful-cleaner_assigned">{j.status.replace(/_/g, " ")}</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {j.booking_reference} · tap to view
                </div>
              </a>
            ))}
          </div>
        )}

        {activeOffers.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>New Online Job Offers</h3>
            {activeOffers.map((o) => (
              <a
                key={o.id}
                href={`/pro/offers/${o.id}`}
                className="card"
                style={{
                  display: "block",
                  textDecoration: "none",
                  marginBottom: 10,
                  borderColor: "var(--neon-green)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ color: "var(--deep-purple)", fontFamily: "var(--font-header)" }}>
                    {o.service_name} · {o.property_bedrooms}BR
                  </strong>
                  <strong style={{ color: "#2f6b00" }}>{koboToNaira(o.payout_kobo)}</strong>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {o.zone_name ?? "—"}
                  {o.plan_frequency === "WEEKLY" && ` · Weekly (${o.plan_visits} visits)`}
                  {o.plan_frequency === "MONTHLY" && ` · Monthly (${o.plan_visits} visits)`}
                  {" · tap to view"}
                </div>
              </a>
            ))}
          </div>
        )}

        <a href="/pro/alerts" className="card" style={{ display: "block", textDecoration: "none", marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>🔔 Enable job alerts</h3>
          <p className="muted">
            Turn on push notifications on this device for schedule updates and new assignments.
          </p>
        </a>
      </div>
    </main>
  );
}

