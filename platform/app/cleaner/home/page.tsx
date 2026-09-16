import { redirect } from "next/navigation";
import { getCleanerContext } from "@/auth/cleaner";
import { getMe } from "@/domain/cleaner/cleaner-service";
import CleanerBar from "../CleanerBar";
import AvailabilityToggle from "../AvailabilityToggle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CleanerHome() {
  const ctx = await getCleanerContext();
  if (!ctx) redirect("/cleaner/login?next=/cleaner/home");

  const me = await getMe(ctx.cleanerId);
  const available = me.availability === "AVAILABLE";

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
