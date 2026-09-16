"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Steps up to IN_PROGRESS. Completion has its own form (CompleteJobForm).
const NEXT: Record<string, { status: string; label: string; hint: string } | null> = {
  ASSIGNED: {
    status: "ON_THE_WAY",
    label: "I'm on my way",
    hint: "You accepted this job. Head over now — please try to arrive within 1 hour.",
  },
  ON_THE_WAY: {
    status: "ARRIVED",
    label: "I'm here",
    hint: "On your way. Tap “I'm here” the moment you arrive — it timestamps your arrival.",
  },
  ARRIVED: {
    status: "IN_PROGRESS",
    label: "Start cleaning",
    hint: "You've arrived. Tap “Start cleaning” when you begin — we'll time the job.",
  },
};

export default function JobActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = NEXT[status];

  async function advance() {
    if (!step) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/cleaner/jobs/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: step.status }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not update.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  if (!step) return null;

  return (
    <div>
      <p className="step-hint" style={{ marginBottom: 12 }}>
        {step.hint}
      </p>
      {error && <div className="notice error">{error}</div>}
      <button
        type="button"
        className="btn-primary"
        style={{ width: "100%", fontSize: 17, padding: 18 }}
        onClick={advance}
        disabled={busy}
      >
        {busy ? "Updating…" : step.label}
      </button>
    </div>
  );
}
