import Link from "next/link";
import LogoutButton from "../admin/LogoutButton";

export default function CleanerBar({ active }: { active: "home" | "profile" }) {
  return (
    <div className="cleaner-bar">
      <Link className="brand" href="/cleaner/home">
        CLEANSE.NG <span>· CLEANER</span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <nav className="nav-links">
          <Link href="/cleaner/home" className={active === "home" ? "here" : ""}>
            Home
          </Link>
          <Link href="/cleaner/profile" className={active === "profile" ? "here" : ""}>
            Profile
          </Link>
        </nav>
        <LogoutButton />
      </div>
    </div>
  );
}
