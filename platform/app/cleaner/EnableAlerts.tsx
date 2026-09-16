"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enablePush, detectPlatform, firebaseConfigured } from "@/lib/firebase-client";

export default function EnableAlerts() {
  const router = useRouter();
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "error"; text: string }>({
    kind: "idle",
    text: "",
  });
  const [busy, setBusy] = useState(false);

  async function onEnable() {
    setBusy(true);
    setStatus({ kind: "idle", text: "" });
    try {
      const result = await enablePush();
      if (!result.ok || !result.token) {
        setStatus({ kind: "error", text: result.reason ?? "Could not enable alerts." });
        setBusy(false);
        return;
      }
      const res = await fetch("/api/v1/cleaner/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fcm_token: result.token,
          platform: detectPlatform(),
          push_permission: "GRANTED",
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not save this device.");
      setStatus({ kind: "ok", text: "Job alerts enabled on this device." });
      router.refresh();
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Could not enable alerts." });
    } finally {
      setBusy(false);
    }
  }

  if (!firebaseConfigured()) {
    return (
      <div className="notice info">
        Push is not configured in this environment yet. Add the Firebase web config to enable job
        alerts.
      </div>
    );
  }

  return (
    <div>
      {status.kind !== "idle" && (
        <div className={`notice ${status.kind === "ok" ? "info" : "error"}`}>{status.text}</div>
      )}
      <button type="button" className="btn-primary" style={{ width: "100%" }} onClick={onEnable} disabled={busy}>
        {busy ? "Enabling…" : "Enable job alerts on this device"}
      </button>
      <p className="muted" style={{ marginTop: 10 }}>
        We&apos;ll ask your browser for notification permission. You can turn this off anytime in your
        browser settings.
      </p>
    </div>
  );
}
