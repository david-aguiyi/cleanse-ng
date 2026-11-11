import Link from "next/link";
import LogoutButton from "../admin/LogoutButton";

export default function ProBar({ active }: { active: "home" | "profile" | "alerts" }) {
  return (
    <div className="cleaner-bar">
      <Link className="brand" href="/pro/home">
        CLEANSE.NG <span>· PRO</span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <nav className="nav-links">
          <Link href="/pro/home" className={active === "home" ? "here" : ""}>
            Home
          </Link>
          <Link href="/pro/alerts" className={active === "alerts" ? "here" : ""}>
            Alerts
          </Link>
          <Link href="/pro/profile" className={active === "profile" ? "here" : ""}>
            Profile
          </Link>
        </nav>
        <LogoutButton redirectTo="/pro/login" />
      </div>
    </div>
  );
}
