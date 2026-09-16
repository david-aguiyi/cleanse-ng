/** Pure display helpers for the admin control centre. */

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
