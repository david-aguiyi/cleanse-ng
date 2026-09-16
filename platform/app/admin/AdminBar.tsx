import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AdminBar({ who }: { who: string }) {
  return (
    <div className="admin-bar">
      <Link className="brand" href="/admin/bookings">
        CLEANSE.NG <span>· OPS</span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className="who">{who}</span>
        <LogoutButton />
      </div>
    </div>
  );
}
