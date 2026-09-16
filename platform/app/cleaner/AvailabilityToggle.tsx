"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AvailabilityToggle({
  initialAvailable,
  ready,
}: {
  initialAvailable: boolean;
  ready: boolean;
}) {
  const router = useRouter();
  const [available, setAvailable] = useState(initialAvailable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const nextAvailable = !available;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/cleaner/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: nextAvailable }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not update availability.");
      setAvailable(json.data.availability === "AVAILABLE");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update availability.");
    } finally {
      setLoading(false);
    }
  }

  // A not-yet-approved cleaner cannot go available at all.
  const canGoAvailable = ready || available;

  return (
    <div className={`avail-card ${available ? "on" : "off"}`}>
      <div className="avail-state">{available ? "You are AVAILABLE" : "You are UNAVAILABLE"}</div>
      <div className="avail-sub">
        {available
          ? "You may receive job alerts while available."
          : "You will not receive job alerts."}
      </div>
      {error && (
        <div className="notice error" style={{ textAlign: "left" }}>
          {error}
        </div>
      )}
      <button
        type="button"
        className={`toggle-btn ${available ? "stop" : "go"}`}
        onClick={toggle}
        disabled={loading || (!available && !canGoAvailable)}
      >
        {loading
          ? "Updating…"
          : available
            ? "Go unavailable"
            : "Go available"}
      </button>
    </div>
  );
}
