"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JOB_STATUSES, splitCleanerPool, type JobStatus } from "@/domain/job/pricing";

interface AssignedCleaner {
  cleaner_id: string;
  slot_order: number;
  cleaner_code: string;
  full_name: string;
  per_clean_share_naira: number;
}

interface SelectableCleaner {
  id: string;
  cleaner_code: string;
  full_name: string;
  account_status: string;
}

interface VisitRow {
  id: string;
  visit_date: string;
  slot: string;
  status: string;
  served_at: string | null;
  locked_paid: boolean;
  earnings: Array<{
    id: string;
    cleaner_id: string;
    cleaner_name: string;
    amount_naira: number;
    payout_id: string | null;
  }>;
}

interface Props {
  jobId: string;
  status: JobStatus;
  cleanerPoolPerClean: number;
  assignedCleaners: AssignedCleaner[];
  selectableCleaners: SelectableCleaner[];
  visits: VisitRow[];
}

function naira(n: number): string {
  return `₦${Math.round(n || 0).toLocaleString("en-NG")}`;
}

function formatVisitDate(iso: string): string {
  const dt = new Date(`${iso}T12:00:00Z`);
  if (isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dt);
}

const VISIT_PILL: Record<string, string> = {
  SCHEDULED: "pay-pending",
  SERVED: "pay-success",
  PAUSED: "ful-unassigned",
  CANCELLED: "pay-failed",
};

export default function ManageInvoiceJob({
  jobId,
  status,
  cleanerPoolPerClean,
  assignedCleaners,
  selectableCleaners,
  visits,
}: Props) {
  const router = useRouter();
  const [cleaner1, setCleaner1] = useState(assignedCleaners[0]?.cleaner_id ?? "");
  const [cleaner2, setCleaner2] = useState(assignedCleaners[1]?.cleaner_id ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Per-visit attendance checkmarks (default all currently assigned cleaners checked)
  const [attendance, setAttendance] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    const ids = assignedCleaners.map((c) => c.cleaner_id);
    for (const v of visits) {
      map[v.id] = ids;
    }
    return map;
  });

  const selectedIds = [cleaner1, cleaner2].filter((x, i, a) => Boolean(x) && a.indexOf(x) === i);
  const previewSplits = splitCleanerPool(cleanerPoolPerClean, selectedIds.length);

  async function saveCleaners() {
    setBusy("cleaners");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/admin/jobs/${jobId}/cleaners`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleaner_ids: selectedIds }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not save team.");
      setNotice("Assigned Cleanse Pros updated & synced to invoice.");
      setAttendance((prev) => {
        const next = { ...prev };
        for (const v of visits) if (v.status !== "SERVED") next[v.id] = selectedIds;
        return next;
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update team.");
    } finally {
      setBusy(null);
    }
  }

  async function transitionStatus(nextStatus: JobStatus) {
    if (nextStatus === status) return;
    if (nextStatus === "TERMINATED") {
      if (
        !window.confirm(
          "Terminate this subscription early?\n\nAll remaining future unserved visits will be cancelled and removed from cleaner /pro schedules & the calendar, while past Served visits & cleaner earnings stay preserved."
        )
      ) {
        return;
      }
    }
    if (nextStatus === "ENDED") {
      if (
        !window.confirm(
          "Mark this subscription as Ended?\n\nAny remaining future unserved visits will be closed and freed from the calendar, while all Served history & unpaid cleaner earnings remain intact."
        )
      ) {
        return;
      }
    }

    setBusy(`status:${nextStatus}`);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/admin/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not update subscription status.");
      setReason("");
      setNotice(`Subscription status changed to ${nextStatus}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update status.");
    } finally {
      setBusy(null);
    }
  }

  async function updateVisit(visitId: string, action: "SERVED" | "UNSERVED" | "CANCELLED" | "SCHEDULED") {
    setBusy(`visit:${visitId}`);
    setError(null);
    setNotice(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "SERVED") {
        body.cleaner_ids = attendance[visitId] ?? selectedIds;
      }
      const res = await fetch(`/api/v1/admin/jobs/${jobId}/visits/${visitId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not update visit.");
      setNotice(
        action === "SERVED"
          ? "Visit marked Served — 70% earnings added to Cleanse Pro balance."
          : `Visit updated to ${json.data.status}.`
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update visit.");
    } finally {
      setBusy(null);
    }
  }

  function toggleAttending(visitId: string, cid: string) {
    setAttendance((prev) => {
      const cur = prev[visitId] ?? [];
      const has = cur.includes(cid);
      const next = has ? cur.filter((x) => x !== cid) : [...cur, cid].slice(0, 2);
      return { ...prev, [visitId]: next };
    });
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice info">{notice}</div>}

      <div className="detail-grid" style={{ marginTop: 0 }}>
        <div className="card">
          <h3>Subscription Lifecycle Status</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Only <strong>ACTIVE</strong> jobs reserve public calendar slots and appear on Cleanse Pro{" "}
            <code>/pro/home</code> schedules. <strong>PAUSED</strong>, <strong>ENDED</strong>, and{" "}
            <strong>TERMINATED</strong> free future calendar slots while strictly keeping past{" "}
            <strong>SERVED</strong> visits &amp; earnings intact.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {JOB_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                disabled={busy !== null || st === status}
                onClick={() => transitionStatus(st)}
                className={st === status ? "btn-primary" : "btn-ghost"}
                style={{ padding: "8px 14px", fontSize: 13 }}
              >
                {busy === `status:${st}` ? "Updating…" : st === status ? `${st} (Current)` : `Set ${st}`}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Optional note / termination or pause reason…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 13.5,
            }}
          />
        </div>

        <div className="card">
          <h3>Assigned Cleanse Pros (up to 2)</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            1 Cleanse Pro earns the full 70% pool ({naira(cleanerPoolPerClean)}/clean). 2 Cleanse Pros split it
            equally (35% each).
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              <span>Primary Cleanse Pro</span>
              <select
                value={cleaner1}
                onChange={(e) => {
                  const v = e.target.value;
                  setCleaner1(v);
                  if (v && v === cleaner2) setCleaner2("");
                }}
                style={{ padding: "9px 10px", borderRadius: 8, border: "1px solid var(--border)" }}
              >
                <option value="">Unassigned</option>
                {selectableCleaners.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === cleaner2}>
                    {c.full_name} · {c.cleaner_code} ({c.account_status})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              <span>Second Cleanse Pro (optional)</span>
              <select
                value={cleaner2}
                onChange={(e) => setCleaner2(e.target.value)}
                style={{ padding: "9px 10px", borderRadius: 8, border: "1px solid var(--border)" }}
              >
                <option value="">None (single cleaner)</option>
                {selectableCleaners.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === cleaner1}>
                    {c.full_name} · {c.cleaner_code} ({c.account_status})
                  </option>
                ))}
              </select>
            </label>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {selectedIds.length === 0 && "No Cleanse Pros selected yet."}
              {selectedIds.length === 1 && `Split: 100% of 70% pool = ${naira(previewSplits[0]?.amountNaira ?? 0)} / clean`}
              {selectedIds.length === 2 &&
                `Split: ${naira(previewSplits[0]?.amountNaira ?? 0)} + ${naira(
                  previewSplits[1]?.amountNaira ?? 0
                )} per clean`}
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={busy !== null}
              onClick={saveCleaners}
              style={{ padding: "10px 16px" }}
            >
              {busy === "cleaners" ? "Saving team…" : "Save Assigned Team"}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Scheduled Visits &amp; Payout Log</h3>
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Mark each completed day as <strong>Served</strong> to credit the attending Cleanse Pro(s) in the
          Payouts desk. Uncheck an absent co-cleaner before marking Served so only attending staff receive
          the cut. Settled (Paid) visits lock automatically to prevent double payments.
        </p>

        <div className="board">
          <table>
            <thead>
              <tr>
                <th>Date &amp; Slot</th>
                <th>Status</th>
                <th>Serving Cleanse Pros &amp; Earnings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 28, color: "var(--mid-gray)" }}>
                    No scheduled visit dates on this job. Open the Invoice Maker to add dates.
                  </td>
                </tr>
              )}
              {visits.map((v) => {
                const attending = attendance[v.id] ?? [];
                return (
                  <tr key={v.id}>
                    <td>
                      <strong>{formatVisitDate(v.visit_date)}</strong>
                      <div className="muted" style={{ fontSize: 12.5 }}>
                        {v.slot}
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${VISIT_PILL[v.status] ?? "neutral"}`}>{v.status}</span>
                      {v.locked_paid && (
                        <div style={{ marginTop: 4 }}>
                          <span className="pill pay-success" style={{ fontSize: 10 }}>
                            Paid &amp; Locked
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      {v.status === "SERVED" ? (
                        <div style={{ display: "grid", gap: 4 }}>
                          {v.earnings.map((e) => (
                            <div key={e.id} style={{ fontSize: 13 }}>
                              <strong>{e.cleaner_name}</strong>: {naira(e.amount_naira)}{" "}
                              <span className="muted" style={{ fontSize: 11.5 }}>
                                ({e.payout_id ? "Settled" : "Unpaid / Owed"})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : assignedCleaners.length === 0 ? (
                        <span className="muted" style={{ fontSize: 12.5 }}>
                          Assign Cleanse Pro above first
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {assignedCleaners.map((c) => (
                            <label
                              key={c.cleaner_id}
                              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}
                            >
                              <input
                                type="checkbox"
                                checked={attending.includes(c.cleaner_id)}
                                onChange={() => toggleAttending(v.id, c.cleaner_id)}
                              />
                              <span>{c.full_name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {v.status === "SCHEDULED" && (
                          <>
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={busy !== null || attending.length === 0}
                              onClick={() => updateVisit(v.id, "SERVED")}
                              style={{ padding: "6px 12px", fontSize: 12.5 }}
                            >
                              {busy === `visit:${v.id}` ? "Saving…" : "Mark Served"}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={busy !== null}
                              onClick={() => updateVisit(v.id, "CANCELLED")}
                              style={{ padding: "6px 10px", fontSize: 12 }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {v.status === "SERVED" && !v.locked_paid && (
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={busy !== null}
                            onClick={() => updateVisit(v.id, "UNSERVED")}
                            style={{ padding: "6px 10px", fontSize: 12 }}
                          >
                            Unmark
                          </button>
                        )}
                        {(v.status === "CANCELLED" || v.status === "PAUSED") && status === "ACTIVE" && (
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={busy !== null}
                            onClick={() => updateVisit(v.id, "SCHEDULED")}
                            style={{ padding: "6px 10px", fontSize: 12 }}
                          >
                            Restore Scheduled
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

