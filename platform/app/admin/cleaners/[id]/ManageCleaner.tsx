"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ZONES, SERVICES } from "@app/book/catalog";

interface CleanerData {
  id: string;
  account_status: string;
  verified: boolean;
  deployment_ready: boolean;
  zones: { code: string; name: string }[];
  services: { code: string; name: string }[];
}

const ACCOUNT_STATES = ["ONBOARDING", "ACTIVE", "SUSPENDED", "INACTIVE"];

export default function ManageCleaner({ cleaner }: { cleaner: CleanerData }) {
  const router = useRouter();
  const [status, setStatus] = useState(cleaner.account_status);
  const [verified, setVerified] = useState(cleaner.verified);
  const [ready, setReady] = useState(cleaner.deployment_ready);
  const [zoneCodes, setZoneCodes] = useState<string[]>(cleaner.zones.map((z) => z.code));
  const [serviceCodes, setServiceCodes] = useState<string[]>(cleaner.services.map((s) => s.code));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, code: string) =>
    set(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

  const wouldBeReady = status === "ACTIVE" && verified && ready;

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/cleaners/${cleaner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_status: status,
          verified,
          deployment_ready: ready,
          zone_codes: zoneCodes,
          service_codes: serviceCodes,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not save.");
      setMsg({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {msg && <div className={`notice ${msg.kind === "ok" ? "info" : "error"}`}>{msg.text}</div>}

      <div className="field">
        <label htmlFor="status">Account status</label>
        <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {ACCOUNT_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} style={{ width: "auto" }} />
        Verified (ID / background checked)
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <input type="checkbox" checked={ready} onChange={(e) => setReady(e.target.checked)} style={{ width: "auto" }} />
        Deployment ready (trained &amp; equipped)
      </label>

      <div className={`readiness ${wouldBeReady ? "ready" : "blocked"}`}>
        {wouldBeReady
          ? "This cleaner will be able to go AVAILABLE and enter the dispatch pool."
          : "Not deployment-ready — cannot go AVAILABLE. Needs ACTIVE + verified + deployment ready."}
      </div>

      <label className="field-label">Zones served</label>
      <div className="chip-row">
        {ZONES.map((z) => (
          <button
            type="button"
            key={z.code}
            className={`chip ${zoneCodes.includes(z.code) ? "selected" : ""}`}
            onClick={() => toggle(zoneCodes, setZoneCodes, z.code)}
          >
            {z.name}
          </button>
        ))}
      </div>

      <label className="field-label">Services qualified</label>
      <div className="chip-row">
        {SERVICES.map((s) => (
          <button
            type="button"
            key={s.code}
            className={`chip ${serviceCodes.includes(s.code) ? "selected" : ""}`}
            onClick={() => toggle(serviceCodes, setServiceCodes, s.code)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <button type="button" className="btn-primary" style={{ width: "100%", marginTop: 6 }} onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
