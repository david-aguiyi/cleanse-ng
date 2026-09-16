import { redirect } from "next/navigation";
import { getCleanerContext } from "@/auth/cleaner";
import { getMe } from "@/domain/cleaner/cleaner-service";
import CleanerBar from "../CleanerBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pct(v: number | null): string {
  return v === null || v === undefined ? "—" : `${Number(v)}%`;
}

export default async function CleanerProfile() {
  const ctx = await getCleanerContext();
  if (!ctx) redirect("/cleaner/login?next=/cleaner/profile");

  const me = await getMe(ctx.cleanerId);

  return (
    <main className="cleaner-shell">
      <CleanerBar active="profile" />
      <div className="cleaner-wrap">
        <div className="card">
          <h1 className="step-title" style={{ fontSize: 20 }}>
            {me.full_name}
          </h1>
          <p className="muted">
            Cleaner ID {me.cleaner_code} · Joined{" "}
            {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
              new Date(me.joined_at)
            )}
          </p>
          {me.bio && <p style={{ marginTop: 10 }}>{me.bio}</p>}

          <div className="cleaner-stats">
            <div className="stat-box">
              <div className="num">{me.completed_jobs ?? 0}</div>
              <div className="cap">Jobs done</div>
            </div>
            <div className="stat-box">
              <div className="num">{me.rating ?? "—"}</div>
              <div className="cap">Rating</div>
            </div>
            <div className="stat-box">
              <div className="num">{pct(me.completion_rate)}</div>
              <div className="cap">Completion</div>
            </div>
          </div>

          <h3 style={{ fontSize: 14, marginTop: 12 }}>Account readiness</h3>
          <div className={`readiness ${me.ready ? "ready" : "blocked"}`}>
            Status {me.account_status} · Verified {me.verified ? "Yes" : "No"} · Deployment ready{" "}
            {me.deployment_ready ? "Yes" : "No"}
          </div>

          <h3 style={{ fontSize: 14 }}>Zones</h3>
          <div>
            {me.zones.length === 0 && <span className="muted">No zones assigned.</span>}
            {me.zones.map((z: Record<string, any>) => (
              <span className="tag" key={z.code}>
                {z.name}
              </span>
            ))}
          </div>

          <h3 style={{ fontSize: 14, marginTop: 12 }}>Services</h3>
          <div>
            {me.services.length === 0 && <span className="muted">No services approved.</span>}
            {me.services.map((s: Record<string, any>) => (
              <span className="tag" key={s.code}>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
