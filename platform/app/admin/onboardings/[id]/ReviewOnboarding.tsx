"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ZONES, SERVICES } from "@app/book/catalog";

interface Props {
  id: string;
  fullName: string;
  initialStatus: string;
  initialNinVerified: boolean;
  initialGuarantorCalled: boolean;
  initialNotes: string | null;
  cleanerId: string | null;
  closestZone: string;
}

const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"];

export default function ReviewOnboarding({
  id,
  fullName,
  initialStatus,
  initialNinVerified,
  initialGuarantorCalled,
  initialNotes,
  cleanerId,
  closestZone,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [ninVerified, setNinVerified] = useState(initialNinVerified);
  const [guarantorCalled, setGuarantorCalled] = useState(initialGuarantorCalled);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Provision cleaner form
  const firstWord = fullName.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || "pro";
  const [showProvision, setShowProvision] = useState(false);
  const [email, setEmail] = useState(`${firstWord}.pro@cleanse.ng`);
  const [password, setPassword] = useState("CleansePro#2026");

  // Map closestZone to code if matching
  const matchedZone = ZONES.find((z) => z.name.toLowerCase().includes(closestZone.toLowerCase()));
  const [zoneCodes, setZoneCodes] = useState<string[]>(matchedZone ? [matchedZone.code] : []);
  const [serviceCodes, setServiceCodes] = useState<string[]>(["REGULAR"]);
  const [provisioning, setProvisioning] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, code: string) =>
    set(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

  async function savePatch(body: Record<string, unknown>, okText: string) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/onboardings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Failed to update.");
      setMsg({ kind: "ok", text: okText });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not update." });
    } finally {
      setSaving(false);
    }
  }

  async function provisionCleaner(e: React.FormEvent) {
    e.preventDefault();
    setProvisioning(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/onboardings/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          zone_codes: zoneCodes,
          service_codes: serviceCodes,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not provision cleaner.");
      router.push(`/admin/cleaners/${json.data.cleaner_id}`);
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Provisioning failed." });
      setProvisioning(false);
    }
  }

  async function removeRecord() {
    if (!window.confirm("Delete this onboarding record permanently?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/onboardings/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not delete.");
      router.push("/admin/onboardings");
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Delete failed." });
      setSaving(false);
    }
  }

  return (
    <div>
      {msg && <div className={`notice ${msg.kind === "ok" ? "info" : "error"}`}>{msg.text}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={ninVerified}
            onChange={(e) => {
              setNinVerified(e.target.checked);
              savePatch({ nin_verified: e.target.checked }, e.target.checked ? "NIN marked verified." : "NIN verification cleared.");
            }}
            style={{ width: "auto" }}
          />
          <strong>NIN Verified</strong> (Matched against NIMC/ID photo)
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={guarantorCalled}
            onChange={(e) => {
              setGuarantorCalled(e.target.checked);
              savePatch(
                { guarantor_called: e.target.checked },
                e.target.checked ? "Guarantor call logged." : "Guarantor call unchecked."
              );
            }}
            style={{ width: "auto" }}
          />
          <strong>Guarantor Called</strong> (Spoke with guarantor & confirmed consent)
        </label>
      </div>

      <div className="field">
        <label htmlFor="ob-status">Review status</label>
        <select
          id="ob-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ob-notes">Admin review &amp; interview notes</label>
        <textarea
          id="ob-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes from NIMC check, guarantor call, or equipment handover..."
        />
      </div>

      <button
        type="button"
        className="btn-ghost"
        style={{ width: "100%", marginBottom: 14, border: "1px solid var(--border)" }}
        onClick={() => savePatch({ status, admin_notes: notes }, "Review status and notes saved.")}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save Review & Notes"}
      </button>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        {cleanerId ? (
          <Link
            href={`/admin/cleaners/${cleanerId}`}
            className="btn-primary"
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
          >
            ✓ Cleaner Account Linked (View Profile ➔)
          </Link>
        ) : !showProvision ? (
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%" }}
            onClick={() => setShowProvision(true)}
          >
            🚀 Approve &amp; Create Cleaner Account
          </button>
        ) : (
          <form onSubmit={provisionCleaner} style={{ background: "var(--off-white)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 10px" }}>Create Active Cleaner Profile</h4>
            <div className="field">
              <label htmlFor="prov-email">Login Email</label>
              <input
                id="prov-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="prov-pass">Temporary Password</label>
              <input
                id="prov-pass"
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <label className="field-label">Zones</label>
            <div className="chip-row" style={{ marginBottom: 10 }}>
              {ZONES.map((z) => (
                <button
                  type="button"
                  key={z.code}
                  className={`chip ${zoneCodes.includes(z.code) ? "selected" : ""}`}
                  onClick={() => toggle(zoneCodes, setZoneCodes, z.code)}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  {z.name}
                </button>
              ))}
            </div>
            <label className="field-label">Services</label>
            <div className="chip-row" style={{ marginBottom: 12 }}>
              {SERVICES.map((s) => (
                <button
                  type="button"
                  key={s.code}
                  className={`chip ${serviceCodes.includes(s.code) ? "selected" : ""}`}
                  onClick={() => toggle(serviceCodes, setServiceCodes, s.code)}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={provisioning}>
                {provisioning ? "Creating…" : "Confirm & Provision"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowProvision(false)}
                disabled={provisioning}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <button
        type="button"
        onClick={removeRecord}
        disabled={saving}
        style={{
          marginTop: 14,
          background: "transparent",
          color: "#b3261e",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          textDecoration: "underline",
          display: "block",
        }}
      >
        Delete onboarding record
      </button>
    </div>
  );
}

