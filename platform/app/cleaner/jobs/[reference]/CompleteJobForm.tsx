"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "I'm done" flow. Timestamps completion, then captures a short on-site report
 * that logs back to admin (customer complaints, things noticed, what went well).
 */
export default function CompleteJobForm({
  bookingId,
  startedAt,
}: {
  bookingId: string;
  startedAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [complaints, setComplaints] = useState("");
  const [positives, setPositives] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live "time on site" so far.
  const elapsed = startedAt
    ? Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000))
    : null;

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/cleaner/jobs/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          report: {
            notes: notes.trim() || undefined,
            complaints: complaints.trim() || undefined,
            positives: positives.trim() || undefined,
          },
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not complete the job.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete the job.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div>
        <p className="step-hint" style={{ marginBottom: 12 }}>
          Cleaning in progress{elapsed !== null ? ` · ${elapsed} min so far` : ""}. Tap “I&apos;m
          done” when you finish.
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ width: "100%", fontSize: 17, padding: 18 }}
          onClick={() => setOpen(true)}
        >
          I&apos;m done
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="notice error">{error}</div>}
      <h3 style={{ fontSize: 15, marginBottom: 4 }}>Quick job report</h3>
      <p className="step-hint" style={{ marginBottom: 12 }}>
        Optional, but it helps the office. Then tap “Finish &amp; submit”.
      </p>

      <div className="field">
        <label htmlFor="complaints">Any complaints from the customer?</label>
        <textarea
          id="complaints"
          rows={2}
          value={complaints}
          onChange={(e) => setComplaints(e.target.value)}
          placeholder="e.g. wanted extra attention on the kitchen"
        />
      </div>
      <div className="field">
        <label htmlFor="notes">Anything you noticed on site?</label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. leaking tap in the bathroom"
        />
      </div>
      <div className="field">
        <label htmlFor="positives">Anything that made the job easier / went well?</label>
        <textarea
          id="positives"
          rows={2}
          value={positives}
          onChange={(e) => setPositives(e.target.value)}
          placeholder="e.g. customer was around, supplies were ready"
        />
      </div>

      <button
        type="button"
        className="btn-primary"
        style={{ width: "100%", fontSize: 17, padding: 18 }}
        onClick={finish}
        disabled={busy}
      >
        {busy ? "Submitting…" : "Finish & submit"}
      </button>
    </div>
  );
}
