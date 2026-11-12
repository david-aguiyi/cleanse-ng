"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { AdminNavCounts } from "@/domain/admin/overview-service";
import LogoutButton from "../LogoutButton";
import OpsGuideDrawer from "./OpsGuideDrawer";

export type AdminNavKey =
  | "overview"
  | "invoices"
  | "jobs"
  | "cleaners"
  | "onboardings"
  | "applicants"
  | "payouts"
  | "settings"
  | "bookings";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavItem {
  key: Exclude<AdminNavKey, "bookings">;
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
  badgeVariant?: "alert" | "urgent";
}

function IconGrid() {
  return (
    <svg className="ops-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconInvoice() {
  return (
    <svg className="ops-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 2-2 2 2 3-2 3 2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg className="ops-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="ops-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg className="ops-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg className="ops-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="ops-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="ops-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.79 1.02 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function SidebarClient({
  who,
  active,
  counts,
  breadcrumbs,
  children,
}: {
  who: string;
  active?: AdminNavKey;
  counts: AdminNavCounts;
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const [whoName, whoRole] = who.split("·").map((s) => s.trim());

  const groups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: "Command",
      items: [{ key: "overview", label: "Overview", href: "/admin", icon: <IconGrid /> }],
    },
    {
      label: "Work",
      items: [
        { key: "invoices", label: "Invoices", href: "/admin/invoices", icon: <IconInvoice /> },
        {
          key: "jobs",
          label: "Jobs & Visits",
          href: "/admin/jobs",
          icon: <IconBriefcase />,
          badge: counts.jobsActionNeeded,
          badgeVariant: "urgent",
        },
      ],
    },
    {
      label: "Cleanse Pros",
      items: [
        { key: "cleaners", label: "Cleanse Pros", href: "/admin/cleaners", icon: <IconUsers /> },
        {
          key: "onboardings",
          label: "Onboarding & NIN",
          href: "/admin/onboardings",
          icon: <IconShieldCheck />,
          badge: counts.onboardingsPending,
          badgeVariant: "alert",
        },
        {
          key: "applicants",
          label: "Applicants",
          href: "/admin/applicants",
          icon: <IconInbox />,
          badge: counts.applicantsNew,
          badgeVariant: "alert",
        },
      ],
    },
    {
      label: "Finance & System",
      items: [
        {
          key: "payouts",
          label: "Payouts (70%)",
          href: "/admin/payouts",
          icon: <IconWallet />,
          badge: counts.payoutsDuePros,
          badgeVariant: "alert",
        },
        { key: "settings", label: "Website Settings", href: "/admin/settings", icon: <IconSettings /> },
      ],
    },
  ];

  return (
    <div className="ops-layout">
      {navOpen && (
        <div className="ops-sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}

      <aside className={`ops-sidebar ${navOpen ? "is-open" : ""}`} aria-label="Operations navigation">
        <Link href="/admin" className="ops-brand" onClick={() => setNavOpen(false)}>
          <div className="ops-brand-mark">
            <span className="ops-brand-dot">C</span>
            <div>
              <div className="ops-brand-title">cleanse.ng</div>
              <div className="ops-brand-sub">Ops Center</div>
            </div>
          </div>
        </Link>

        <nav className="ops-nav">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="ops-nav-group-label">{group.label}</div>
              <div className="ops-nav-list">
                {group.items.map((item) => {
                  const isActive = active === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setNavOpen(false)}
                      className={`ops-nav-link ${isActive ? "is-active" : ""}`}
                    >
                      <span className="ops-nav-link-left">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span
                          className={`ops-badge ${
                            item.badgeVariant === "urgent" ? "is-urgent" : "is-alert"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="ops-sidebar-footer">
          <div className="ops-admin-pill">
            <span className="ops-admin-name">{whoName || who}</span>
            {whoRole && <span className="ops-admin-role">{whoRole}</span>}
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="ops-stage">
        <header className="ops-topbar">
          <div className="ops-topbar-left">
            <button
              type="button"
              className="ops-menu-btn"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <nav className="ops-breadcrumbs" aria-label="Breadcrumb">
              <Link href="/admin">Ops</Link>
              {breadcrumbs.map((bc, idx) => (
                <span key={`${bc.label}-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span className="ops-breadcrumb-sep">/</span>
                  {bc.href ? (
                    <Link href={bc.href}>{bc.label}</Link>
                  ) : (
                    <span className="ops-breadcrumb-current">{bc.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <div className="ops-topbar-actions">
            <Link href="/admin/invoices/new" className="ops-quick-btn is-primary">
              + New Invoice
            </Link>
            <Link href="/admin/cleaners/new" className="ops-quick-btn">
              + Add Cleanse Pro
            </Link>
            <button
              type="button"
              className="ops-quick-btn is-guide"
              onClick={() => setGuideOpen(true)}
            >
              ? Ops Guide
            </button>
          </div>
        </header>

        <main className="ops-main">{children}</main>
      </div>

      <OpsGuideDrawer open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}

