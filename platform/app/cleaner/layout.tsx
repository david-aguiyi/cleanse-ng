import { getCleanerContext } from "@/auth/cleaner";
import LogoutButton from "./../admin/LogoutButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cleaner area gate. A blocked (SUSPENDED) cleaner sees only a "blocked" notice —
 * even if signed in, they cannot reach any job data. Everyone else passes through.
 */
export default async function CleanerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCleanerContext();

  if (ctx && ctx.accountStatus === "SUSPENDED") {
    return (
      <main className="cleaner-shell">
        <div className="cleaner-bar">
          <span className="brand">
            CLEANSE.NG <span>· CLEANER</span>
          </span>
          <LogoutButton />
        </div>
        <div className="cleaner-wrap">
          <div className="card" style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#fdecea",
                color: "#b3261e",
                display: "grid",
                placeItems: "center",
                fontSize: 30,
                margin: "0 auto 14px",
              }}
            >
              ⛔
            </div>
            <h1 className="step-title">You&apos;ve been blocked</h1>
            <p className="step-hint">
              Your cleaner account has been blocked by admin.
              {ctx.blockReason ? ` Reason: ${ctx.blockReason}` : ""}
            </p>
            <p className="muted">
              Please reach out to the Cleanse office if you&apos;d like to be unblocked.
            </p>
            <a
              className="btn-primary"
              href="https://wa.me/2349130663739?text=Hi%20Cleanse%2C%20my%20cleaner%20account%20was%20blocked."
              target="_blank"
              rel="noreferrer"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Contact the office
            </a>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
