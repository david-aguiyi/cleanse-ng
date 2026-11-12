"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function OpsGuideDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ops-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Cleanse Operations Playbook"
      onClick={onClose}
    >
      <aside className="ops-drawer" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--primary-purple)",
                fontFamily: "var(--font-header)",
              }}
            >
              Cleanse Operations Playbook
            </div>
            <h2 style={{ fontSize: 20, margin: "4px 0 0" }}>How the System Works</h2>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "6px 12px" }}
          >
            Close ✕
          </button>
        </div>

        <div className="ops-guide-section">
          <h3>1. Invoices → Jobs &amp; Visits (Daily Workflow)</h3>
          <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>
              <strong>Create an Invoice</strong> in{" "}
              <Link href="/admin/invoices/new" onClick={onClose}>
                Invoices → + New Invoice
              </Link>{" "}
              and enter customer address, bedrooms, schedule days, time slot, and optional 1–2 Cleanse Pros.
            </li>
            <li>
              Use <strong>Awaiting Payment (Pending)</strong> for quotes before a client transfers, or{" "}
              <strong>Active</strong> once paid. Tapping <strong>Save / Download PDF</strong> automatically
              creates &amp; syncs the Job in{" "}
              <Link href="/admin/jobs" onClick={onClose}>
                Jobs &amp; Visits
              </Link>
              .
            </li>
            <li>
              On cleaning day, open the job and tap <strong>Mark Served</strong> beside the visit date.
              You can uncheck an absent Cleanse Pro if only 1 Pro showed up so they earn the full 70% pool.
            </li>
          </ol>
        </div>

        <div className="ops-guide-section">
          <h3>2. Hiring &amp; Onboarding New Cleanse Pros</h3>
          <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>
              Candidates apply on{" "}
              <Link href="/admin/applicants" onClick={onClose}>
                Applicants
              </Link>
              . Review and send them the public onboarding form link (<code>/pro/onboard</code>).
            </li>
            <li>
              Completed onboarding submissions appear in{" "}
              <Link href="/admin/onboardings" onClick={onClose}>
                Onboarding &amp; NIN
              </Link>
              . Verify their photo &amp; NIN, call their guarantor, then click{" "}
              <strong>Approve &amp; Create Account</strong>.
            </li>
            <li>
              Once approved, the Pro immediately appears in the{" "}
              <Link href="/admin/cleaners" onClick={onClose}>
                Cleanse Pros
              </Link>{" "}
              roster and inside Invoice Maker dropdowns. Set their login password on their profile so they
              can sign in at <code>/pro</code>.
            </li>
          </ol>
        </div>

        <div className="ops-guide-section">
          <h3>3. What Cleanse Pros See &amp; Monthly 70% Payouts</h3>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>
              <strong>Privacy lock:</strong> Pros see their assigned jobs on <code>/pro/home</code> with the{" "}
              <em>Area</em> shown upfront, while exact house number unlocks <strong>1 hour before</strong>{" "}
              the cleaning window (client phone stays admin-only).
            </li>
            <li>
              <strong>Payout pool:</strong> After supplies (₦800 for 1–2BR, ₦1,500 for 3+ BR) are deducted per
              visit, Pros earn <strong>70%</strong> split equally across attending Pros.
            </li>
            <li>
              <strong>Paying monthly:</strong> Transfer manually using the bank details saved on{" "}
              <Link href="/admin/payouts" onClick={onClose}>
                Payouts
              </Link>
              , then click <strong>Confirm Paid</strong> with a cut-off date to zero out settled cleans and
              generate a locked receipt.
            </li>
          </ul>
        </div>

        <div className="ops-guide-section">
          <h3>4. Why Isn&apos;t Something Showing Up?</h3>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>
              <strong>Pro missing in Invoice dropdown?</strong> Check{" "}
              <Link href="/admin/onboardings" onClick={onClose}>
                Onboarding &amp; NIN
              </Link>{" "}
              — they only become assignable once approved (or Status isn&apos;t Blocked/Suspended).
            </li>
            <li>
              <strong>Zero payout balance?</strong> Earnings appear only after a visit is marked{" "}
              <strong>Served</strong> in Jobs &amp; Visits.
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

