import { redirect } from "next/navigation";
import { getCleanerContext } from "@/auth/cleaner";
import { getMe } from "@/domain/cleaner/cleaner-service";
import { listOffers } from "@/domain/assignment/assignment-service";
import { listActiveJobs } from "@/domain/job/job-service";
import CleanerBar from "../CleanerBar";
import AvailabilityToggle from "../AvailabilityToggle";
import AccountControls from "../AccountControls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function naira(kobo: number): string {
  return `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;
}

export default async function CleanerHome() {
  const ctx = await getCleanerContext();
  if (!ctx) redirect("/cleaner/login?next=/cleaner/home");

  const [me, offers, activeJobs] = await Promise.all([
    getMe(ctx.cleanerId),
    listOffers(ctx.cleanerId),
    listActiveJobs(ctx.cleanerId),
  ]);
  const available = me.availability === "AVAILABLE";
  const activeOffers = offers.filter((o) => o.is_active);

  return (
    <main className="cleaner-shell">
      <CleanerBar active="home" />
      <div className="cleaner-wrap">
        <h1 className="step-title" style={{ fontSize: 20 }}>
          Hi {me.full_name.split(" ")[0]}
        </h1>

        {!me.ready ? (
          <div className="readiness blocked">
            <strong>Not deployment-ready yet.</strong> An operator still needs to verify and activate
            your account before you can go available and receive jobs.
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              <li>Account status: {me.account_status}</li>
              <li>Verified: {me.verified ? "Yes" : "No"}</li>
              <li>Deployment ready: {me.deployment_ready ? "Yes" : "No"}</li>
            </ul>
          </div>
        ) : (
          <div className="readiness ready">
            <strong>You&apos;re approved.</strong> Toggle available to start receiving job alerts.
          </div>
        )}

        <AvailabilityToggle initialAvailable={available} ready={me.ready} />

        <AccountControls accountStatus={me.account_status} idleDays={me.idle_days ?? 0} />

        {activeJobs.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Your active job{activeJobs.length > 1 ? "s" : ""}</h3>
            {activeJobs.map((j) => (
              <a
                key={j.booking_reference}
                href={`/cleaner/jobs/${j.booking_reference}`}
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
                  {j.booking_reference} · tap to manage
                </div>
              </a>
            ))}
          </div>
        )}

        {activeOffers.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>New job offers</h3>
            {activeOffers.map((o) => (
              <a
                key={o.id}
                href={`/cleaner/offers/${o.id}`}
                className="card"
                style={{ display: "block", textDecoration: "none", marginBottom: 10, borderColor: "var(--neon-green)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ color: "var(--deep-purple)", fontFamily: "var(--font-header)" }}>
                    {o.service_name} · {o.property_bedrooms}BR
                  </strong>
                  <strong style={{ color: "#2f6b00" }}>{naira(o.payout_kobo)}</strong>
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

        <a href="/cleaner/alerts" className="card" style={{ display: "block", textDecoration: "none", marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>🔔 Enable job alerts</h3>
          <p className="muted">
            Turn on push notifications so you hear about new jobs the moment they&apos;re available.
          </p>
        </a>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>Today</h3>
          <p className="muted">
            Job offers and active jobs appear here once dispatch goes live (Stages 6–10).
          </p>
        </div>
      </div>
    </main>
  );
}
