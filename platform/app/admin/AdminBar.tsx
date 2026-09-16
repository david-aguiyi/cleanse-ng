import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AdminBar({
  who,
  active,
}: {
  who: string;
  active?: "bookings" | "cleaners";
}) {
  return (
    <div className="admin-bar">
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link className="brand" href="/admin/bookings">
          CLEANSE.NG <span>· OPS</span>
        </Link>
        <nav className="nav-links">
          <Link href="/admin/bookings" className={active === "bookings" ? "here" : ""}>
            Bookings
          </Link>
          <Link href="/admin/cleaners" className={active === "cleaners" ? "here" : ""}>
            Cleaners
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
