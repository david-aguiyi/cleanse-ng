"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["NEW", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"];

export default function ReviewActions({
  applicationId,
  initialStatus,
  initialNotes,
}: {
  applicationId: string;
  initialStatus: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(body: { status?: string; note?: string }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/applicants/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not save.");
      setStatus(json.data.status);
      setNotes(json.data.admin_notes ?? "");
      if (body.note) setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this application permanently?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/applicants/${applicationId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not delete.");
      router.replace("/admin/applicants");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
      setDeleting(false);
    }
  }

  return (
    <div>
      {error && <div className="notice error">{error}</div>}
      <div className="kv">
        <span className="k">Status</span>
        <select
          value={status}
          disabled={saving || deleting}
          onChange={(e) => save({ status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {notes && <div className="notes-log">{notes}</div>}
      <textarea
        className="note-area"
        placeholder="Add a private note (call outcome, references checked…)"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={deleting}
      />
      <div className="action-btns" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={() => save({ note: draft.trim() })} disabled={saving || deleting || !draft.trim()}>
          {saving ? "Saving…" : "Add note"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving || deleting}
          style={{
            background: "transparent",
            color: "#b3261e",
            borderColor: "#fecaca",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {deleting ? "Deleting…" : "Delete application 🗑️"}
        </button>
      </div>
    </div>
  );
}
