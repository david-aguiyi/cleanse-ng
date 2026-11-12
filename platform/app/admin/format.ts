/** Pure display helpers for the admin control centre. */

export type StatusTone = "green" | "amber" | "red" | "purple" | "neutral";

export interface HumanStatus {
  label: string;
  tone: StatusTone;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m || !m[1] || !m[2] || !m[3]) return iso;
  const monthIdx = +m[2] - 1;
  const monthName = MONTH_NAMES[monthIdx] ?? m[2];
  return `${+m[3]} ${monthName} ${m[1]}`;
}

export function naira(kobo: number): string {
  return `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;
}

/** Formats an already-in-Naira amount (used by Invoice Jobs & Cleanse Pro payouts). */
export function nairaAmount(amount: number | null | undefined): string {
  return `₦${Math.round(Number(amount ?? 0)).toLocaleString("en-NG")}`;
}

export function lagos(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function humanEvent(type: string): string {
  return type.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Minutes since a booking was confirmed but not yet assigned (SLA signal). */
export function minutesSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

/** Only WhatsApp digits (wa.me expects no plus). */
export function waDigits(e164: string): string {
  return (e164 || "").replace(/[^\d]/g, "");
}

function lookupStatus(
  map: Record<string, HumanStatus>,
  raw: string | null | undefined,
  fallback = "Unknown"
): HumanStatus {
  const key = String(raw ?? "").trim().toUpperCase();
  if (key && map[key]) return map[key];
  const label = key
    ? key.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : fallback;
  return { label, tone: "neutral" };
}

const JOB_STATUS_MAP: Record<string, HumanStatus> = {
  ACTIVE: { label: "Active", tone: "green" },
  PENDING: { label: "Awaiting Payment", tone: "amber" },
  PAUSED: { label: "Paused", tone: "neutral" },
  ENDED: { label: "Completed", tone: "purple" },
  TERMINATED: { label: "Terminated", tone: "red" },
};

const VISIT_STATUS_MAP: Record<string, HumanStatus> = {
  SCHEDULED: { label: "Upcoming", tone: "purple" },
  SERVED: { label: "Served", tone: "green" },
  PAUSED: { label: "Paused", tone: "amber" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};

const CLEANER_STATUS_MAP: Record<string, HumanStatus> = {
  ACTIVE: { label: "Active", tone: "green" },
  ONBOARDING: { label: "Onboarding", tone: "amber" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
  SUSPENDED: { label: "Blocked", tone: "red" },
};

const APPLICANT_STATUS_MAP: Record<string, HumanStatus> = {
  NEW: { label: "New", tone: "amber" },
  REVIEWING: { label: "Reviewing", tone: "purple" },
  SHORTLISTED: { label: "Shortlisted", tone: "green" },
  HIRED: { label: "Hired", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
};

const ONBOARDING_STATUS_MAP: Record<string, HumanStatus> = {
  SUBMITTED: { label: "Needs Review", tone: "amber" },
  UNDER_REVIEW: { label: "Under Review", tone: "purple" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
};

export function humanJobStatus(status: string | null | undefined): HumanStatus {
  return lookupStatus(JOB_STATUS_MAP, status);
}

export function humanVisitStatus(status: string | null | undefined): HumanStatus {
  return lookupStatus(VISIT_STATUS_MAP, status);
}

export function humanCleanerStatus(status: string | null | undefined): HumanStatus {
  return lookupStatus(CLEANER_STATUS_MAP, status);
}

export function humanApplicantStatus(status: string | null | undefined): HumanStatus {
  return lookupStatus(APPLICANT_STATUS_MAP, status);
}

export function humanOnboardingStatus(status: string | null | undefined): HumanStatus {
  return lookupStatus(ONBOARDING_STATUS_MAP, status);
}
