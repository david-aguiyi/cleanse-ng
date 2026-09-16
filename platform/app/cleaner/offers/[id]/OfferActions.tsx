"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OfferActions({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);

  async function accept() {
    setBusy("accept");
    setError(null);
    try {
      const res = await fetch(`/api/v1/cleaner/offers/${offerId}/accept`, { method: "POST" });
      const json = await res.json();
      if (json.ok && json.data?.result === "WON") {
        router.replace(`/cleaner/offers/${offerId}`);
        router.refresh();
        return;
      }
      if (json.error?.code === "OFFER_ALREADY_TAKEN") {
        setTaken(true);
        router.refresh();
        return;
      }
      setError(json.error?.message ?? "This offer is no longer active.");
      router.refresh();
    } catch {
      setError("Could not accept. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    setBusy("decline");
    setError(null);
    try {
      await fetch(`/api/v1/cleaner/offers/${offerId}/decline`, { method: "POST" });
      router.replace("/cleaner/home");
      router.refresh();
    } catch {
      setError("Could not decline. Try again.");
      setBusy(null);
    }
  }

  if (taken) {
    return <div className="notice info">This job has already been taken.</div>;
  }

  return (
    <div>
      {error && <div className="notice error">{error}</div>}
      <button
        type="button"
        className="btn-primary"
        style={{ width: "100%", fontSize: 18, padding: 18 }}
        onClick={accept}
        disabled={busy !== null}
      >
        {busy === "accept" ? "Claiming…" : "I'M AVAILABLE"}
      </button>
      <button
        type="button"
        className="btn-ghost"
        style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
        onClick={decline}
        disabled={busy !== null}
      >
        {busy === "decline" ? "…" : "Not available"}
      </button>
    </div>
  );
}
