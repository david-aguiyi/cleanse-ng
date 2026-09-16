"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT: Record<string, { status: string; label: string } | null> = {
  ASSIGNED: { status: "ON_THE_WAY", label: "I'm on the way" },
  ON_THE_WAY: { status: "ARRIVED", label: "I've arrived" },
  ARRIVED: { status: "IN_PROGRESS", label: "Start cleaning" },
  IN_PROGRESS: { status: "COMPLETED", label: "Mark complete" },
  COMPLETED: null,
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

  if (!step) {
    return <div className="notice info">This job is complete. Thank you!</div>;
  }

  return (
    <div>
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
