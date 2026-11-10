"use client";

import { useState } from "react";
import { buildApplicantWhatsAppUrl, getApplicantSelectionMessage } from "../applicant-message";

export default function ApplicantWhatsAppAction({
  phone,
  fullName,
}: {
  phone: string;
  fullName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const message = getApplicantSelectionMessage(fullName);
  const waUrl = buildApplicantWhatsAppUrl(phone, fullName);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--deep-purple)", display: "block", marginBottom: 3 }}>
          Candidate Selection Outreach
        </span>
        <span style={{ fontSize: 12.5, color: "var(--mid-gray)" }}>
          Send prefilled WhatsApp message detailing pay per job, locations, and next meeting.
        </span>
      </div>

      <div className="action-btns" style={{ marginTop: 2 }}>
        <a
          className="wa"
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          💬 Send on WhatsApp ↗
        </a>
        <button type="button" onClick={copy}>
          {copied ? "Copied ✓" : "Copy text"}
        </button>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          style={{ fontSize: 12, color: "var(--mid-gray)" }}
        >
          {showPreview ? "Hide preview ▲" : "Preview message ▼"}
        </button>
      </div>

      {showPreview && (
        <div
          style={{
            background: "var(--off-white)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 12,
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--charcoal)",
            maxHeight: 220,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-body)",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
