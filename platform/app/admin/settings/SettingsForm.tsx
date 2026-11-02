"use client";

import { useState, useMemo } from "react";
import { parseNigerianPhone, type FormattedPhone } from "@/domain/settings/phone-format";

export default function SettingsForm({
  initialWhatsapp,
  updatedAt,
}: {
  initialWhatsapp: FormattedPhone;
  updatedAt?: string;
}) {
  const [inputVal, setInputVal] = useState(initialWhatsapp.raw);
  const [activeWhatsapp, setActiveWhatsapp] = useState<FormattedPhone>(initialWhatsapp);
  const [lastSaved, setLastSaved] = useState<string | undefined>(updatedAt);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live parsed preview of whatever the admin is currently typing
  const livePreview = useMemo(() => {
    return parseNigerianPhone(inputVal);
  }, [inputVal]);

  const hasChanges = livePreview ? livePreview.digits !== activeWhatsapp.digits : false;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!livePreview) {
      setErrorMsg("Please enter a valid Nigerian phone number.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_number: inputVal }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message ?? "Failed to save settings.");
      }

      const updated = json.data.whatsapp as FormattedPhone;
      setActiveWhatsapp(updated);
      setInputVal(updated.raw);
      setLastSaved(json.data.updatedAt || new Date().toISOString());
      setSuccessMsg(
        `✓ WhatsApp number successfully updated to ${updated.display}! It is now active across the entire website instantly.`
      );

      // Also update local storage for immediate browser sync
      try {
        localStorage.setItem("_cleanse_wa_config", JSON.stringify({
          raw: updated.raw,
          digits: updated.digits,
          international: updated.international,
          display: updated.display,
          local_display: updated.localDisplay,
          wa_url: updated.waUrl,
        }));
      } catch {}
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 24 }}>
      {successMsg && (
        <div
          style={{
            background: "#ECFDF5",
            border: "1.5px solid #10B981",
            color: "#065F46",
            padding: "14px 18px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1.5px solid #EF4444",
            color: "#991B1B",
            padding: "14px 18px",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Current Active Number Card */}
      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--primary-purple)" }}>
            Active WhatsApp Number
          </h2>
          <span
            style={{
              background: "#ECFDF5",
              color: "#059669",
              padding: "4px 10px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            ● LIVE ON SITE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: "var(--black)" }}>
            {activeWhatsapp.display}
          </span>
          <span style={{ color: "var(--mid-gray)", fontSize: 14 }}>
            ({activeWhatsapp.localDisplay})
          </span>
        </div>

        <div style={{ fontSize: 13, color: "var(--mid-gray)", display: "flex", gap: 20 }}>
          <span>
            Link target:{" "}
            <a
              href={activeWhatsapp.waUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--primary-purple)", fontWeight: 600 }}
            >
              {activeWhatsapp.waUrl} ↗
            </a>
          </span>
          {lastSaved && (
            <span>
              Last updated: {new Date(lastSaved).toLocaleDateString("en-NG", { dateStyle: "medium" })}
            </span>
          )}
        </div>
      </div>

      {/* Edit Form */}
      <form
        onSubmit={handleSave}
        style={{
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>
            Change WhatsApp Number
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--mid-gray)" }}>
            Type any Nigerian number in standard format (e.g. <code>08167734221</code> or{" "}
            <code>+234 816 773 4221</code>). Saving immediately redirects all customer WhatsApp buttons
            and footer links across the website to this number.
          </p>
        </div>

        <div>
          <label
            htmlFor="wa_input"
            style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}
          >
            New Number
          </label>
          <input
            id="wa_input"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="08167734221"
            style={{
              width: "100%",
              maxWidth: 380,
              padding: "10px 14px",
              fontSize: 16,
              borderRadius: 8,
              border: "1.5px solid var(--border)",
              fontFamily: "monospace",
            }}
          />
        </div>

        {/* Live Preview Box */}
        {livePreview ? (
          <div
            style={{
              background: "var(--off-white)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 16,
              fontSize: 13,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--dark-gray)", marginBottom: 2 }}>
              Format Preview:
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ color: "var(--mid-gray)", width: 140 }}>Display format:</span>
              <strong style={{ color: "var(--black)" }}>{livePreview.display}</strong>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ color: "var(--mid-gray)", width: 140 }}>WhatsApp Direct Link:</span>
              <a
                href={livePreview.waUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--primary-purple)", textDecoration: "underline" }}
              >
                {livePreview.waUrl}
              </a>
            </div>
          </div>
        ) : (
          inputVal.trim().length > 0 && (
            <div style={{ fontSize: 13, color: "#DC2626" }}>
              ⚠️ Please enter an 11-digit Nigerian phone number (e.g. 0816 773 4221).
            </div>
          )
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 4 }}>
          <button
            type="submit"
            disabled={saving || !livePreview || !hasChanges}
            style={{
              background: !hasChanges || !livePreview ? "#D1D5DB" : "var(--primary-purple)",
              color: "var(--white)",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: !hasChanges || !livePreview || saving ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {saving ? "Saving Changes..." : "Save Number"}
          </button>

          {!hasChanges && livePreview && (
            <span style={{ fontSize: 13, color: "var(--mid-gray)" }}>
              Current number is already saved.
            </span>
          )}
        </div>
      </form>

      {/* Explanatory Help Card */}
      <div
        style={{
          background: "rgba(58, 29, 109, 0.04)",
          border: "1px dashed rgba(58, 29, 109, 0.25)",
          borderRadius: "var(--radius)",
          padding: 20,
          fontSize: 13,
          color: "var(--dark-gray)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ display: "block", marginBottom: 6, color: "var(--primary-purple)" }}>
          How this works across the site:
        </strong>
        Whenever you update this number, the change applies dynamically across:
        <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
          <li>All marketing and SEO pages (all 30+ service, location and blog pages)</li>
          <li>Every &quot;Book Now on WhatsApp&quot; and &quot;Chat with us&quot; button</li>
          <li>All footer WhatsApp contact details and telephone links</li>
          <li>Booking confirmation and cleaner dispatch notification screens</li>
        </ul>
        No developer deployments or code changes required!
      </div>
    </div>
  );
}
