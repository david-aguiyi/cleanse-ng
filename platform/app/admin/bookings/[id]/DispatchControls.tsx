"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DispatchControls({
  bookingId,
  canDispatch,
}: {
  bookingId: string;
  canDispatch: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function rebroadcast() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/bookings/${bookingId}/rebroadcast`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not start a dispatch round.");
      const d = json.data;
      setMsg({
        kind: "ok",
        text: `Round ${d.round}: ${d.offersCreated} offer(s) created, ${d.pushSent} push sent.`,
      });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not dispatch." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {msg && <div className={`notice ${msg.kind === "ok" ? "info" : "error"}`}>{msg.text}</div>}
      <button
        type="button"
        className="btn-primary"
        style={{ width: "100%" }}
        onClick={rebroadcast}
        disabled={busy || !canDispatch}
      >
        {busy ? "Dispatching…" : "Start / rebroadcast dispatch round"}
      </button>
      {!canDispatch && (
        <p className="muted" style={{ marginTop: 8 }}>
          Dispatch is available once payment is confirmed and the job is not completed or cancelled.
        </p>
      )}
    </div>
  );
}
