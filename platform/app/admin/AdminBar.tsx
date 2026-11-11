import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AdminBar({
  who,
  active,
}: {
  who: string;
  active?: "bookings" | "jobs" | "payouts" | "cleaners" | "applicants" | "onboardings" | "invoices" | "settings";
}) {
  return (
    <div className="admin-bar">
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <Link className="brand" href="/admin/bookings">
          CLEANSE.NG <span>· OPS</span>
        </Link>
        <nav className="nav-links" style={{ flexWrap: "wrap" }}>
          <Link href="/admin/bookings" className={active === "bookings" ? "here" : ""}>
            Bookings
          </Link>
          <Link href="/admin/jobs" className={active === "jobs" ? "here" : ""}>
            Jobs
          </Link>
          <Link href="/admin/payouts" className={active === "payouts" ? "here" : ""}>
            Payouts
          </Link>
          <Link href="/admin/cleaners" className={active === "cleaners" ? "here" : ""}>
            Cleaners
          </Link>
          <Link href="/admin/applicants" className={active === "applicants" ? "here" : ""}>
            Applicants
          </Link>
          <Link href="/admin/onboardings" className={active === "onboardings" ? "here" : ""}>
            Onboardings
          </Link>
          <Link href="/admin/invoices" className={active === "invoices" ? "here" : ""}>
            Invoices
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
