import { redirect } from "next/navigation";
import { getCleanerContext } from "@/auth/cleaner";
import { getMe } from "@/domain/cleaner/cleaner-service";
import { getCleanerEarningsSummary } from "@/domain/payout/payout-service";
import ProBar from "../ProBar";
import BankAccountForm from "../BankAccountForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pct(v: number | null): string {
  return v === null || v === undefined ? "—" : `${Number(v)}%`;
}

function naira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

export default async function ProProfilePage() {
  const ctx = await getCleanerContext();
  if (!ctx) redirect("/pro/login?next=/pro/profile");

  const [me, earnings] = await Promise.all([
    getMe(ctx.cleanerId),
    getCleanerEarningsSummary(ctx.cleanerId),
  ]);

  return (
    <main className="cleaner-shell">
      <ProBar active="profile" />
      <div className="cleaner-wrap">
        <div className="card" style={{ marginBottom: 18 }}>
          <h1 className="step-title" style={{ fontSize: 20 }}>
            {me.full_name}
          </h1>
          <p className="muted">
            Cleanse Pro ID {me.cleaner_code} · Joined{" "}
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

        <div id="bank" className="card" style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>Payout Bank Account</h2>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Add the Nigerian bank account where you receive your 70% Cleanse Pro payouts.
          </p>
          <BankAccountForm initialBank={earnings.bankAccount} schemaReady={earnings.schemaReady} />
        </div>

        {earnings.schemaReady && (
          <div className="card">
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Earnings &amp; Monthly Payouts (70% cut)</h2>
            <div className="cleaner-stats" style={{ marginBottom: 14 }}>
              <div className="stat-box">
                <div className="num">{naira(earnings.unpaidTotalNaira)}</div>
                <div className="cap">Unpaid owed ({earnings.unpaidCount})</div>
              </div>
              <div className="stat-box">
                <div className="num">{naira(earnings.paidTotalAllTimeNaira)}</div>
                <div className="cap">Paid to date</div>
              </div>
            </div>

            {earnings.unpaidByMonth.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, marginBottom: 6 }}>Pending by month</h3>
                {earnings.unpaidByMonth.map((b) => (
                  <div className="kv" key={b.month_key}>
                    <span className="k">{b.month_key} ({b.visit_count} clean{b.visit_count === 1 ? "" : "s"})</span>
                    <strong>{naira(b.total_naira)}</strong>
                  </div>
                ))}
              </div>
            )}

            {earnings.unpaidEarnings.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, marginBottom: 6 }}>Unpaid served cleans</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {earnings.unpaidEarnings.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        fontSize: 13,
                        borderTop: "1px solid var(--border, #e5e7eb)",
                        paddingTop: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{e.job_label}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {e.earned_on} · {e.source_type === "INVOICE_VISIT" ? "Plan clean" : "Online job"}
                          {e.supplies_deducted_naira > 0
                            ? ` (after ₦${e.supplies_deducted_naira.toLocaleString("en-NG")} supplies)`
                            : ""}
                        </div>
                      </div>
                      <strong style={{ color: "#2f6b00", whiteSpace: "nowrap" }}>
                        {naira(e.amount_naira)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Settled Payout Receipts</h3>
            {earnings.payouts.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                No settled payouts recorded yet. Once an operator marks a month paid, your receipt appears
                here and your owed balance clears.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {earnings.payouts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      borderTop: "1px solid var(--border, #e5e7eb)",
                      paddingTop: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {p.period_key} · {p.earning_count} clean{p.earning_count === 1 ? "" : "s"}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.bank_name} · {p.account_number} ({p.account_name})
                      </div>
                      {p.reference_note && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          Ref: {p.reference_note}
                        </div>
                      )}
                      <div className="muted" style={{ fontSize: 11 }}>
                        Paid {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(p.settled_at))}
                      </div>
                    </div>
                    <strong style={{ color: "var(--deep-purple)", whiteSpace: "nowrap" }}>
                      {naira(p.total_amount_naira)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

