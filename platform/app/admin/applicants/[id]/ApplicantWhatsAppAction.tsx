"use client";

import { useState } from "react";
import {
  buildApplicantWhatsAppUrl,
  getApplicantSelectionMessage,
  getTimeOfDayGreeting,
} from "../applicant-message";

const GREETING_OPTIONS = [
  { id: "AUTO", label: "Auto-detect" },
  { id: "Good morning", label: "Good morning" },
  { id: "Good afternoon", label: "Good afternoon" },
  { id: "Good evening", label: "Good evening" },
  { id: "Good day", label: "Good day" },
];

export default function ApplicantWhatsAppAction({
  phone,
  fullName,
}: {
  phone: string;
  fullName: string;
}) {
  const [selectedGreeting, setSelectedGreeting] = useState<string>("AUTO");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const autoGreeting = getTimeOfDayGreeting();
  const activeGreeting = selectedGreeting === "AUTO" ? autoGreeting : selectedGreeting;

  const message = getApplicantSelectionMessage(fullName, activeGreeting);
  const waUrl = buildApplicantWhatsAppUrl(phone, fullName, activeGreeting);

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
          Prefilled WhatsApp message with time-of-day greeting, pay structure, and next steps.
        </span>
      </div>

      {/* Greeting selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
        <span style={{ color: "var(--mid-gray)", fontWeight: 600 }}>Greeting:</span>
        {GREETING_OPTIONS.map((opt) => {
          const isSelected = selectedGreeting === opt.id;
          const displayLabel = opt.id === "AUTO" ? `Auto (${autoGreeting})` : opt.label;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedGreeting(opt.id)}
              style={{
                fontSize: 11.5,
                padding: "3px 8px",
                borderRadius: 6,
                border: isSelected ? "1.5px solid var(--primary-purple)" : "1px solid var(--border)",
                background: isSelected ? "rgba(58, 29, 109, 0.08)" : "var(--white)",
                color: isSelected ? "var(--primary-purple)" : "var(--charcoal)",
                fontWeight: isSelected ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {displayLabel}
            </button>
          );
        })}
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
