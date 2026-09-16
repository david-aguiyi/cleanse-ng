"use client";

import { useState } from "react";

export default function NotesForm({
  bookingId,
  initialNotes,
}: {
  bookingId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/bookings/${bookingId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: draft.trim() }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not save note.");
      setNotes(json.data.operations_notes);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error && <div className="notice error">{error}</div>}
      {notes && <div className="notes-log">{notes}</div>}
      <textarea
        className="note-area"
        placeholder="Add an operations note…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="action-btns">
        <button type="button" onClick={save} disabled={saving || !draft.trim()}>
          {saving ? "Saving…" : "Add note"}
        </button>
      </div>
    </div>
  );
}
