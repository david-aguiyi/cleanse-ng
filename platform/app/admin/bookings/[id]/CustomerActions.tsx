"use client";

import { useState } from "react";
import { waDigits } from "../../format";

/**
 * Customer action panel (Blueprint §11.3). Open WhatsApp / call / copy summary.
 * NO automatic "cleaner on the way" message — the admin always sends manually.
 */
export default function CustomerActions({
  whatsapp,
  phone,
  summary,
}: {
  whatsapp: string;
  phone: string;
  summary: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="action-btns">
      {whatsapp && (
        <a className="wa" href={`https://wa.me/${waDigits(whatsapp)}`} target="_blank" rel="noreferrer">
          Open WhatsApp
        </a>
      )}
      {phone && <a href={`tel:${phone}`}>Call</a>}
      <button type="button" onClick={copy}>
        {copied ? "Copied ✓" : "Copy summary"}
      </button>
    </div>
  );
}
