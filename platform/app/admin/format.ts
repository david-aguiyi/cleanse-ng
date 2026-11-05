/** Pure display helpers for the admin control centre. */

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
