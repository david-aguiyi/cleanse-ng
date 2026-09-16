import { redirect } from "next/navigation";
import { getCleanerContext } from "@/auth/cleaner";
import { listDevices } from "@/domain/cleaner/device-service";
import CleanerBar from "../CleanerBar";
import EnableAlerts from "../EnableAlerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function lastSeen(iso: string | null): string {
  if (!iso) return "never";
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function CleanerAlerts() {
  const ctx = await getCleanerContext();
  if (!ctx) redirect("/cleaner/login?next=/cleaner/alerts");

  const devices = await listDevices(ctx.cleanerId);
  const activeCount = devices.filter((d) => d.is_active && d.push_permission === "GRANTED").length;

  return (
    <main className="cleaner-shell">
      <CleanerBar active="home" />
      <div className="cleaner-wrap">
        <h1 className="step-title" style={{ fontSize: 20 }}>
          Job alerts
        </h1>
        <p className="muted">
          Turn on alerts so you hear about new jobs instantly. On iPhone, add this app to your Home
          Screen first, then enable alerts.
        </p>

        <div className={`readiness ${activeCount > 0 ? "ready" : "blocked"}`} style={{ marginTop: 14 }}>
          {activeCount > 0
            ? `Alerts are on for ${activeCount} device${activeCount > 1 ? "s" : ""}.`
            : "No active alert device yet. Enable alerts below."}
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Enable on this device</h3>
          <EnableAlerts />
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Your devices</h3>
          {devices.length === 0 && <p className="muted">No devices registered yet.</p>}
          {devices.map((d) => (
            <div className="kv" key={d.id}>
              <span className="k">
                {d.platform.replace("_", " ")} · {d.push_permission}
              </span>
              <span>
                {d.is_active ? "Active" : "Inactive"} · {lastSeen(d.last_seen_at)}
              </span>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 14, marginTop: 18 }}>Install to Home Screen</h3>
        <p className="muted">
          iPhone/iPad: Share → Add to Home Screen. Android: menu → Install app / Add to Home Screen.
          Installing keeps you signed in and lets alerts arrive in the background.
        </p>
      </div>
    </main>
  );
}
