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
  applicantId,
}: {
  phone: string;
  fullName: string;
  applicantId?: string;
}) {
  const [selectedGreeting, setSelectedGreeting] = useState<string>("AUTO");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const autoGreeting = getTimeOfDayGreeting();
  const activeGreeting = selectedGreeting === "AUTO" ? autoGreeting : selectedGreeting;

  const message = getApplicantSelectionMessage(fullName, activeGreeting);
  const waUrl = buildApplicantWhatsAppUrl(phone, fullName, activeGreeting);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://cleanse.ng";
  const onboardParams = new URLSearchParams();
  if (applicantId) onboardParams.set("app", applicantId);
  if (fullName) onboardParams.set("name", fullName);
  if (phone) onboardParams.set("phone", phone);
  const onboardUrl = `${origin}/pro/onboard?${onboardParams.toString()}`;

  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const cleanDigits = phone.replace(/[^\d]/g, "");
  const formattedDigits = cleanDigits.startsWith("0") ? "234" + cleanDigits.slice(1) : cleanDigits;
  const onboardWaMsg = `${activeGreeting} ${firstName}, glad to have you move forward with Cleanse.ng!\n\nPlease complete your official Cleanse Pro Onboarding & Verification Form (with your clear photo, NIN details, address, guarantor info, and agreement) using your personal link below before we confirm your in-person meeting:\n\n${onboardUrl}\n\nCleanse.ng Operations`;
  const onboardWaUrl = `https://wa.me/${formattedDigits}?text=${encodeURIComponent(onboardWaMsg)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(onboardUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
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

      {/* Step 2: Onboarding Form Link */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--deep-purple)", display: "block", marginBottom: 4 }}>
          If they replied YES — Send Onboarding Form
        </span>
        <div className="action-btns">
          <a
            className="wa"
            href={onboardWaUrl}
            target="_blank"
            rel="noreferrer"
            style={{ background: "#3a1d6d", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            📋 WhatsApp Onboarding Form ↗
          </a>
          <button type="button" onClick={copyLink}>
            {copiedLink ? "Link Copied ✓" : "Copy Form Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
