"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClearApplicationsButton({ totalCount }: { totalCount: number }) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    if (confirmText.trim().toUpperCase() !== "CLEAR") {
      setError("Please type CLEAR to confirm.");
      return;
    }
    setClearing(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/applicants/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Failed to clear applications.");
      setShowModal(false);
      setConfirmText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setClearing(false);
    }
  }

  if (totalCount === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowModal(true);
          setError(null);
          setConfirmText("");
        }}
        style={{
          background: "transparent",
          color: "#b3261e",
          border: "1px solid #fecaca",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        🗑️ Clear Applications
      </button>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !clearing && setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 18, color: "var(--deep-purple)" }}>
              Clear All Applications?
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--mid-gray)", lineHeight: 1.5 }}>
              This will permanently delete all {totalCount} applicant records from the database so you can
              start fresh with new inputs. This action <strong>cannot be undone</strong>.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--charcoal)",
                }}
              >
                Type <strong>CLEAR</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CLEAR"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1.5px solid var(--border)",
                  fontFamily: "monospace",
                  fontSize: 14,
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#991b1b",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowModal(false)}
                disabled={clearing}
                style={{ padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={clearing || confirmText.trim().toUpperCase() !== "CLEAR"}
                style={{
                  background: "#b3261e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontWeight: 600,
                  cursor: clearing || confirmText.trim().toUpperCase() !== "CLEAR" ? "not-allowed" : "pointer",
                  opacity: confirmText.trim().toUpperCase() !== "CLEAR" ? 0.6 : 1,
                }}
              >
                {clearing ? "Clearing…" : "Yes, Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
