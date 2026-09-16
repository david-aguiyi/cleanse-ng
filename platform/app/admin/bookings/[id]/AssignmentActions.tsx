"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssignmentActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"share" | "reassign" | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  async function share() {
    setBusy("share");
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/bookings/${bookingId}/share-card`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not create the card.");
      setCardUrl(json.data.url);
      // Second click for the admin: WhatsApp opens prefilled; they press Send.
      window.open(json.data.wa_url, "_blank", "noopener");
      setMsg({ kind: "ok", text: "Card created and WhatsApp opened — review and press Send." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not create the card." });
    } finally {
      setBusy(null);
    }
  }

  async function reassign() {
    const reason = window.prompt("Reason for reassignment?", "Cleaner unavailable");
    if (reason === null) return;
    setBusy("reassign");
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/bookings/${bookingId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Operations reassignment" }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not reassign.");
      setCardUrl(null);
      setMsg({ kind: "ok", text: "Assignment closed and share card revoked. Booking is back in dispatch." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not reassign." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {msg && <div className={`notice ${msg.kind === "ok" ? "info" : "error"}`}>{msg.text}</div>}
      {cardUrl && (
        <p className="muted" style={{ wordBreak: "break-all", fontSize: 12 }}>
          Card: {cardUrl}
        </p>
      )}
      <div className="action-btns">
        <button type="button" className="wa" onClick={share} disabled={busy !== null}>
          {busy === "share" ? "Preparing…" : "Share with customer (WhatsApp)"}
        </button>
        <button type="button" onClick={reassign} disabled={busy !== null}>
          {busy === "reassign" ? "…" : "Reassign cleaner"}
        </button>
      </div>
    </div>
  );
}
