import Link from "next/link";

export default function CleanseProTabs({
  active,
}: {
  active: "all" | "leaderboard" | "new";
}) {
  return (
    <nav className="ops-subtabs" aria-label="Cleanse Pros views">
      <Link href="/admin/cleaners" className={`ops-subtab ${active === "all" ? "is-active" : ""}`}>
        All Cleanse Pros
      </Link>
      <Link
        href="/admin/cleaners/leaderboard"
        className={`ops-subtab ${active === "leaderboard" ? "is-active" : ""}`}
      >
        Leaderboard &amp; Scores
      </Link>
      <Link
        href="/admin/cleaners/new"
        className={`ops-subtab ${active === "new" ? "is-active" : ""}`}
      >
        + Add Pro Manually
      </Link>
    </nav>
  );
}

