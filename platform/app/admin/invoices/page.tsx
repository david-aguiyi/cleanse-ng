import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listInvoices } from "@/domain/invoice/invoice-service";
import { serviceClient } from "@/db/service-client";
import { lagosTodayIso, summariseInvoiceSchedule } from "@/domain/invoice/schedule";
import { humanJobStatus, lagos, nairaAmount, shortDate } from "../format";
import AdminShell from "../_components/AdminShell";
import StatusBadge from "../_components/StatusBadge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILTER_TABS = [
  { id: "all", label: "All Invoices" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Awaiting Payment" },
  { id: "ended", label: "Completed" },
] as const;

type FilterId = (typeof FILTER_TABS)[number]["id"];

function deriveInvoiceBucket(jobStatus: string | null, start?: string, end?: string, today?: string): FilterId {
  if (jobStatus === "PENDING") return "pending";
  if (jobStatus === "ENDED" || jobStatus === "TERMINATED") return "ended";
  if (jobStatus === "ACTIVE") return "active";
  if (end && today && end < today) return "ended";
  if (start && today && start >= today) return "active";
  return "active";
}

export default async function AdminInvoices({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string };
}) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/invoices");

  const filter = (FILTER_TABS.some((t) => t.id === searchParams.filter)
    ? searchParams.filter
    : "all") as FilterId;

  const invoices = await listInvoices(searchParams.q);
  const today = lagosTodayIso();

  // Map invoice_id -> synced job record so each row links cleanly to its Job.
  const jobMap = new Map<string, { id: string; status: string }>();
  if (invoices.length > 0) {
    try {
      const { data: jobRows } = await serviceClient()
        .from("invoice_jobs")
        .select("id, invoice_id, status")
        .in(
          "invoice_id",
          invoices.map((i: Record<string, any>) => i.id)
        );
      for (const row of (jobRows ?? []) as Array<{ id: string; invoice_id: string; status: string }>) {
        jobMap.set(row.invoice_id, { id: row.id, status: row.status });
      }
    } catch {
      // Ignore if migration 0015 not applied yet.
    }
  }

  const enriched = invoices.map((inv: Record<string, any>) => {
    const data = (inv.data || {}) as Record<string, any>;
    const job = jobMap.get(inv.id) ?? null;
    const rawJobStatus = job?.status ?? (typeof data.jobStatus === "string" ? data.jobStatus : "ACTIVE");
    const bucket = deriveInvoiceBucket(rawJobStatus, data.startDate, data.endDate, today);
    return { inv, data, job, rawJobStatus, bucket };
  });

  const counts: Record<FilterId, number> = {
    all: enriched.length,
    active: enriched.filter((e) => e.bucket === "active").length,
    pending: enriched.filter((e) => e.bucket === "pending").length,
    ended: enriched.filter((e) => e.bucket === "ended").length,
  };

  const visible = filter === "all" ? enriched : enriched.filter((e) => e.bucket === filter);

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="invoices"
      breadcrumbs={[{ label: "Invoices" }]}
      title="Invoices"
      subtitle="Create & download customer invoice PDFs. Saving automatically syncs a Job & reserves booking calendar slots."
      actions={
        <Link className="btn-primary" href="/admin/invoices/new" style={{ padding: "10px 18px" }}>
          + New Invoice
        </Link>
      }
    >
      <div className="ops-chips">
        {FILTER_TABS.map((tab) => {
          const href =
            tab.id === "all"
              ? searchParams.q
                ? `/admin/invoices?q=${encodeURIComponent(searchParams.q)}`
                : "/admin/invoices"
              : `/admin/invoices?filter=${tab.id}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""}`;
          return (
            <Link key={tab.id} href={href} className={`ops-chip ${filter === tab.id ? "is-active" : ""}`}>
              <span>{tab.label}</span>
              <span className="ops-chip-count">{counts[tab.id]}</span>
            </Link>
          );
        })}
      </div>

      <form className="filters" method="get">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <input name="q" placeholder="Search invoice #, client, or address…" defaultValue={searchParams.q ?? ""} />
        <button type="submit" className="btn-ghost">
          Search
        </button>
      </form>

      <div className="board">
        <table>
          <thead>
            <tr>
              <th>Invoice &amp; Created</th>
              <th>Client</th>
              <th>Plan Status &amp; Dates</th>
              <th>Serving Schedule</th>
              <th>Total</th>
              <th>Synced Job</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--mid-gray)" }}>
                  {searchParams.q || filter !== "all"
                    ? "No invoices match your filter."
                    : "No saved invoices yet. Click + New Invoice to create the first one."}
                </td>
              </tr>
            )}
            {visible.map(({ inv, data, job, rawJobStatus }) => {
              const start = data.startDate as string | undefined;
              const end = data.endDate as string | undefined;
              const isSingleDay = !end || start === end;
              const sched = summariseInvoiceSchedule(data);
              const jobStatusMeta = humanJobStatus(rawJobStatus);

              return (
                <tr key={inv.id}>
                  <td>
                    <Link className="ref" href={`/admin/invoices/${inv.id}`}>
                      {inv.invoice_number}
                    </Link>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                      {lagos(inv.created_at)}
                      {inv.creator?.full_name ? ` · ${inv.creator.full_name}` : ""}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--deep-purple)" }}>
                      {inv.client_name || inv.client_address || "—"}
                    </div>
                    {inv.client_name && inv.client_address && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {inv.client_address}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={jobStatusMeta} />
                    {start && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {shortDate(start)}
                        {!isSingleDay && ` – ${shortDate(end)}`}
                      </div>
                    )}
                  </td>
                  <td>
                    {sched.slotLabel ? (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {sched.daysLabel ? `${sched.daysLabel} · ` : ""}
                          {sched.slotLabel}
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {sched.reservedOnCalendar
                            ? `${sched.visitCount} ${sched.visitCount === 1 ? "visit" : "visits"} on calendar`
                            : "Calendar not reserved"}
                        </div>
                      </div>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>No time slot set</span>
                    )}
                  </td>
                  <td>
                    <strong>{nairaAmount(inv.total_naira)}</strong>
                  </td>
                  <td>
                    {job ? (
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="ops-quick-btn"
                        style={{ padding: "5px 11px", fontSize: 12 }}
                      >
                        View Job →
                      </Link>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>Save to sync</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
