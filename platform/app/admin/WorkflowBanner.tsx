"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cleanse_ops_workflow_hidden";

export default function WorkflowBanner() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        setHidden(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  function hideBanner() {
    setHidden(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  function showBanner() {
    setHidden(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  if (hidden) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button
          type="button"
          className="ops-quick-btn"
          onClick={showBanner}
          style={{ fontSize: 12, padding: "5px 11px" }}
        >
          Show &ldquo;How Cleanse Works&rdquo; Flow
        </button>
      </div>
    );
  }

  return (
    <section className="ops-workflow" aria-label="How Cleanse Operations Work">
      <div className="ops-workflow-top">
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "var(--neon-green)", textTransform: "uppercase", fontFamily: "var(--font-header)" }}>
            New Admin Quick-Start
          </div>
          <h2 style={{ color: "#fff", fontSize: 17, margin: "3px 0 4px" }}>
            How Cleanse Operations Run End-to-End
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--lavender)" }}>
            Every customer order flows from <strong>Invoice → Job &amp; Visits → 70% Payouts</strong>. Tap any step to jump in, or open <strong>? Ops Guide</strong> anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={hideBanner}
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            borderRadius: 8,
            padding: "6px 11px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Hide guide ✕
        </button>
      </div>

      <div className="ops-workflow-steps">
        <Link href="/admin/invoices/new" className="ops-workflow-step">
          <span className="ops-workflow-num">Step 1 · Invoice</span>
          <div className="ops-workflow-name">Create Customer Invoice</div>
          <div className="ops-workflow-desc">
            Set bedrooms, schedule days, slot &amp; status. Saving auto-creates the Job.
          </div>
        </Link>

        <Link href="/admin/jobs" className="ops-workflow-step">
          <span className="ops-workflow-num">Step 2 · Jobs &amp; Visits</span>
          <div className="ops-workflow-name">Assign Pros &amp; Mark Served</div>
          <div className="ops-workflow-desc">
            Assign 1–2 onboarded Cleanse Pros and mark cleans Served as they finish.
          </div>
        </Link>

        <Link href="/admin/onboardings" className="ops-workflow-step">
          <span className="ops-workflow-num">Hiring · Talent</span>
          <div className="ops-workflow-name">Approve Onboarding &amp; NIN</div>
          <div className="ops-workflow-desc">
            Verify NIN + guarantor, approve Pro accounts, then set their /pro password.
          </div>
        </Link>

        <Link href="/admin/payouts" className="ops-workflow-step">
          <span className="ops-workflow-num">Step 3 · Finance</span>
          <div className="ops-workflow-name">Pay 70% Pool Monthly</div>
          <div className="ops-workflow-desc">
            Transfer to saved Pro bank accounts and tap Confirm Paid to issue receipts.
          </div>
        </Link>
      </div>
    </section>
  );
}

