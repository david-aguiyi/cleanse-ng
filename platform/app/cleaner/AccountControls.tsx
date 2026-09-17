"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountControls({
  accountStatus,
  idleDays,
}: {
  accountStatus: string;
  idleDays: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function call(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not update your account.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your account.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  // Paused: show resume.
  if (accountStatus === "INACTIVE") {
    return (
      <div className="card" style={{ marginBottom: 18, borderColor: "#e0a800" }}>
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>Your account is paused</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          You won&apos;t receive any job offers while paused. Resume whenever you&apos;re ready.
        </p>
        {error && <div className="notice error">{error}</div>}
        <button type="button" className="btn-primary" style={{ width: "100%" }} onClick={() => call("/api/v1/cleaner/resume")} disabled={busy}>
          {busy ? "Resuming…" : "Resume my account"}
        </button>
      </div>
    );
  }

  // Active: idle nudge after ~10 days, plus a pause option.
  const idleNudge = idleDays >= 10;
  return (
    <div
      className="card"
      style={{ marginBottom: 18, borderColor: idleNudge ? "#e0a800" : undefined }}
    >
      {idleNudge ? (
        <>
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>Not getting jobs lately?</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            It&apos;s been {idleDays} days since your last job. If you don&apos;t want to keep
            receiving offers, you can pause your account. You can resume anytime.
          </p>
        </>
      ) : (
        <p className="muted" style={{ marginTop: 0 }}>
          Taking a break? You can pause your account to stop receiving job offers.
        </p>
      )}
      {error && <div className="notice error">{error}</div>}
      {confirming ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={() => call("/api/v1/cleaner/pause")} disabled={busy}>
            {busy ? "Pausing…" : "Yes, pause"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="btn-ghost" onClick={() => setConfirming(true)}>
          Pause my account
        </button>
      )}
    </div>
  );
}
