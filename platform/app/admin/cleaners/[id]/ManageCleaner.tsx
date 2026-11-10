"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ZONES, SERVICES } from "@app/book/catalog";

interface CleanerData {
  id: string;
  account_status: string;
  verified: boolean;
  deployment_ready: boolean;
  work_rate_label?: string | null;
  block_reason?: string | null;
  zones: { code: string; name: string }[];
  services: { code: string; name: string }[];
}

const ACCOUNT_STATES = ["ONBOARDING", "ACTIVE", "SUSPENDED", "INACTIVE"];
const PRESET_TAGS = ["UNDER_SUPERVISION", "PROBATION", "TRAINEE", "SENIOR", "RELIABLE"];

export default function ManageCleaner({ cleaner }: { cleaner: CleanerData }) {
  const router = useRouter();
  const [status, setStatus] = useState(cleaner.account_status);
  const [verified, setVerified] = useState(cleaner.verified);
  const [ready, setReady] = useState(cleaner.deployment_ready);
  const [tag, setTag] = useState(cleaner.work_rate_label ?? "");
  const [zoneCodes, setZoneCodes] = useState<string[]>(cleaner.zones.map((z) => z.code));
  const [serviceCodes, setServiceCodes] = useState<string[]>(cleaner.services.map((s) => s.code));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, code: string) =>
    set(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

  const wouldBeReady = status === "ACTIVE" && verified && ready;
  const isBlocked = status === "SUSPENDED";
  const isUnderSupervision = tag === "UNDER_SUPERVISION";
  const isFired = tag === "FIRED" || (isBlocked && cleaner.block_reason?.startsWith("FIRED:"));

  async function patch(body: Record<string, unknown>, okText: string) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/cleaners/${cleaner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not save.");
      setMsg({ kind: "ok", text: okText });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  async function block() {
    const reason = window.prompt(
      "Why are you blocking this cleaner? (shown to them)",
      "Policy violation"
    );
    if (reason === null) return;
    setStatus("SUSPENDED");
    await patch({ account_status: "SUSPENDED", block_reason: reason || "Blocked by admin." }, "Cleaner blocked.");
  }

  async function unblock() {
    setStatus("ACTIVE");
    if (tag === "FIRED") setTag("");
    await patch({ account_status: "ACTIVE", work_rate_label: tag === "FIRED" ? null : tag }, "Cleaner unblocked.");
  }

  async function fireCleaner() {
    const reason = window.prompt(
      "Why are you firing this cleaner? (This will immediately suspend their account, drop availability, and mark them as FIRED)",
      ""
    );
    if (reason === null) return;
    setStatus("SUSPENDED");
    setTag("FIRED");
    await patch(
      {
        account_status: "SUSPENDED",
        work_rate_label: "FIRED",
        block_reason: `FIRED: ${reason.trim() || "Terminated by admin."}`,
      },
      "Cleaner fired and removed from dispatch."
    );
  }

  async function toggleSupervision() {
    const nextTag = isUnderSupervision ? null : "UNDER_SUPERVISION";
    setTag(nextTag ?? "");
    await patch(
      { work_rate_label: nextTag },
      nextTag ? "Cleaner placed under supervision." : "Cleaner removed from supervision."
    );
  }

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
          work_rate_label: tag.trim() ? tag.trim().toUpperCase() : null,
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

      <div
        className={`readiness ${isBlocked ? "blocked" : "ready"}`}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
      >
        <span>
          {isFired
            ? "⛔ This cleaner is FIRED / TERMINATED."
            : isBlocked
            ? "⛔ This cleaner is suspended."
            : isUnderSupervision
            ? "⚠️ Cleaner is UNDER SUPERVISION."
            : "Cleaner is active and ready."}
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isBlocked ? (
            <button type="button" className="btn-ghost" onClick={unblock} disabled={saving}>
              {isFired ? "Rehire / Unsuspend" : "Unblock"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleSupervision}
                disabled={saving}
                style={{
                  background: isUnderSupervision ? "#d97706" : "#fef3c7",
                  color: isUnderSupervision ? "#fff" : "#92400e",
                  border: "1px solid #d97706",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isUnderSupervision ? "✓ Under supervision" : "⚠️ Put under supervision"}
              </button>
              <button
                type="button"
                onClick={fireCleaner}
                disabled={saving}
                style={{
                  background: "#b3261e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ⛔ Fire cleaner
              </button>
            </>
          )}
        </div>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="tag">Status tag / Performance label</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {PRESET_TAGS.map((t) => (
            <button
              type="button"
              key={t}
              className={`chip ${tag === t ? "selected" : ""}`}
              onClick={() => setTag(tag === t ? "" : t)}
              style={{ fontSize: 12, padding: "4px 8px" }}
            >
              {t === "UNDER_SUPERVISION" ? "⚠️ UNDER SUPERVISION" : t}
            </button>
          ))}
          {tag && (
            <button
              type="button"
              className="chip"
              onClick={() => setTag("")}
              style={{ fontSize: 12, padding: "4px 8px", color: "var(--mid-gray)" }}
            >
              ✕ Clear tag
            </button>
          )}
        </div>
        <input
          id="tag"
          placeholder="Custom tag (e.g. UNDER_SUPERVISION, TRAINEE, PROBATION)"
          value={tag}
          onChange={(e) => setTag(e.target.value.toUpperCase())}
        />
      </div>

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
