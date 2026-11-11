"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  cleanerId: string;
  email: string | null;
  initialPassword: string | null;
  storageReady: boolean;
  canManagePassword: boolean;
}

type CopyField = "email" | "password" | "both" | null;

async function writeClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fallback below if clipboard API is unavailable over non-HTTPS origin
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

const smallBtnStyle: React.CSSProperties = {
  background: "var(--off-white, #f7f7fb)",
  color: "var(--deep-purple, #1d0c3d)",
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  lineHeight: 1.5,
};

export default function CleanerCredentials({
  cleanerId,
  email,
  initialPassword,
  storageReady,
  canManagePassword,
}: Props) {
  const router = useRouter();
  const [password, setPassword] = useState<string | null>(initialPassword);
  const [revealed, setRevealed] = useState(true);
  const [copied, setCopied] = useState<CopyField>(null);
  const [editing, setEditing] = useState(false);
  const [draftPassword, setDraftPassword] = useState(initialPassword ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function copy(field: Exclude<CopyField, null>, value: string) {
    const ok = await writeClipboard(value);
    if (!ok) {
      setStatus({ kind: "error", text: "Could not access clipboard. Select and copy manually." });
      return;
    }
    setCopied(field);
    window.setTimeout(() => {
      setCopied((curr) => (curr === field ? null : curr));
    }, 1800);
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 6; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
    setDraftPassword(`Cleanse#${rand}`);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (draftPassword.length < 8) {
      setStatus({ kind: "error", text: "Password must be at least 8 characters." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/v1/admin/cleaners/${cleanerId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: draftPassword }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Could not save password.");
      }
      setPassword(json.data.temporary_password);
      setRevealed(true);
      setEditing(false);
      setStatus({ kind: "ok", text: "Password saved and updated on their login account." });
      router.refresh();
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not save password.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="kv">
        <span className="k">Email</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ wordBreak: "break-all" }}>{email ?? "—"}</span>
          {email && (
            <button
              type="button"
              style={smallBtnStyle}
              onClick={() => copy("email", email)}
              aria-label="Copy login email"
            >
              {copied === "email" ? "Copied ✓" : "Copy"}
            </button>
          )}
        </span>
      </div>

      <div className="kv" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="k" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Password
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: "#f3e8ff",
                color: "#6b21a8",
                padding: "1px 7px",
                borderRadius: 999,
              }}
            >
              Admin only
            </span>
          </span>

          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {password ? (
              <>
                <code
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 13,
                    background: "var(--off-white, #f7f7fb)",
                    padding: "2px 7px",
                    borderRadius: 6,
                    border: "1px solid var(--border, #e5e7eb)",
                  }}
                >
                  {revealed ? password : "•".repeat(Math.min(password.length, 14))}
                </code>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() => setRevealed((r) => !r)}
                >
                  {revealed ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() => copy("password", password)}
                  aria-label="Copy temporary password"
                >
                  {copied === "password" ? "Copied ✓" : "Copy"}
                </button>
              </>
            ) : (
              <span className="muted" style={{ fontSize: 13 }}>
                Not saved yet
              </span>
            )}

            {canManagePassword && !editing && (
              <button
                type="button"
                style={smallBtnStyle}
                onClick={() => {
                  setDraftPassword(password ?? "CleansePro#2026");
                  setStatus(null);
                  setEditing(true);
                }}
              >
                {password ? "Reset" : "Set password"}
              </button>
            )}
          </span>
        </div>

        {email && password && !editing && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              style={{ ...smallBtnStyle, fontSize: 11 }}
              onClick={() => copy("both", `Login URL: ${window.location.origin}/pro/login\nEmail: ${email}\nPassword: ${password}`)}
            >
              {copied === "both" ? "Copied login message ✓" : "Copy email & password"}
            </button>
          </div>
        )}

        {!storageReady && (
          <div className="notice info" style={{ margin: 0, fontSize: 12 }}>
            Run migration <code>0014_cleaner_admin_credentials.sql</code> in Supabase to store &amp; view cleaner passwords here.
          </div>
        )}

        {status && (
          <div className={`notice ${status.kind === "ok" ? "info" : "error"}`} style={{ margin: 0, fontSize: 12 }}>
            {status.text}
          </div>
        )}

        {editing && (
          <form
            onSubmit={savePassword}
            style={{
              background: "var(--off-white, #f7f7fb)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 8,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input
                type="text"
                minLength={8}
                required
                value={draftPassword}
                onChange={(e) => setDraftPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{ flex: 1, minWidth: 160 }}
              />
              <button type="button" style={smallBtnStyle} onClick={generatePassword}>
                Generate
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="muted" style={{ fontSize: 11 }}>
                Updates Supabase Auth login &amp; saves an admin-only copy.
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() => {
                    setEditing(false);
                    setStatus(null);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "5px 12px", fontSize: 12 }}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save password"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

