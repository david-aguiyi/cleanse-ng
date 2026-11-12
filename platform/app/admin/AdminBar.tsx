import Link from "next/link";
import LogoutButton from "./LogoutButton";

/**
 * Legacy top bar kept only as a fallback; all active /admin routes use AdminShell.
 */
export default function AdminBar({
  who,
  active,
}: {
  who: string;
  active?: "jobs" | "payouts" | "cleaners" | "applicants" | "onboardings" | "invoices" | "settings" | "bookings";
}) {
  return (
    <div className="admin-bar">
      <div className="left">
        <span className="brand">
          <Link href="/admin" style={{ color: "#fff", textDecoration: "none" }}>
            cleanse.ng · ops
          </Link>
        </span>
        <nav className="admin-nav">
          <Link href="/admin" className={!active ? "here" : ""}>
            Overview
          </Link>
          <Link href="/admin/invoices" className={active === "invoices" ? "here" : ""}>
            Invoices
          </Link>
          <Link href="/admin/jobs" className={active === "jobs" ? "here" : ""}>
            Jobs
          </Link>
          <Link href="/admin/cleaners" className={active === "cleaners" ? "here" : ""}>
            Cleanse Pros
          </Link>
          <Link href="/admin/onboardings" className={active === "onboardings" ? "here" : ""}>
            Onboarding
          </Link>
          <Link href="/admin/applicants" className={active === "applicants" ? "here" : ""}>
            Applicants
          </Link>
          <Link href="/admin/payouts" className={active === "payouts" ? "here" : ""}>
            Payouts
          </Link>
          <Link href="/admin/settings" className={active === "settings" ? "here" : ""}>
            Settings
          </Link>
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className="who">{who}</span>
        <LogoutButton />
      </div>
    </div>
  );
}
