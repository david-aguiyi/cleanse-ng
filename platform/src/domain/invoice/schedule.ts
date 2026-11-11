/**
 * Invoice & Calendar Schedule Helpers (pure, timezone-safe Africa/Lagos logic).
 * Maps invoice schedules and paid online bookings into canonical Cleanse.ng
 * website calendar slots so saved invoices automatically register availability.
 */

export const CANONICAL_SLOTS = ["8am - 11am", "11am - 2pm", "2pm - 5pm"] as const;
export type CanonicalSlot = (typeof CANONICAL_SLOTS)[number];

export const SUNDAY_ONLY_SLOT: CanonicalSlot = "2pm - 5pm";

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_PLURAL = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
] as const;

export interface ScheduledVisit {
  date: string; // YYYY-MM-DD
  slot: CanonicalSlot;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = ISO_DATE_RE.exec(v.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isoDateToUtcMs(dateStr: string): number {
  const m = ISO_DATE_RE.exec(dateStr.trim());
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function utcMsToIsoDate(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekdayOfIsoDate(dateStr: string): number | null {
  const ms = isoDateToUtcMs(dateStr);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).getUTCDay();
}

export function normalizeSlot(raw: unknown): CanonicalSlot | null {
  if (raw == null) return null;
  const s = String(raw)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;

  if (s === "8am - 11am" || s === "8am-11am" || s.includes("8am") || s.includes("8:00") || s.includes("morning")) {
    return "8am - 11am";
  }
  if (
    s === "11am - 2pm" ||
    s === "11am-2pm" ||
    s.includes("11am") ||
    s.includes("11:00") ||
    s.includes("midday") ||
    s.includes("noon") ||
    s.includes("afternoon")
  ) {
    return "11am - 2pm";
  }
  if (
    s === "2pm - 5pm" ||
    s === "2pm-5pm" ||
    s.includes("2pm") ||
    s.includes("14:00") ||
    s.includes("3pm") ||
    s.includes("evening")
  ) {
    return "2pm - 5pm";
  }

  // Numeric time like "09:30", "13:00", "15:00"
  const hhmm = /^(\d{1,2}):\d{2}/.exec(s);
  if (hhmm) {
    const h = Number(hhmm[1]);
    if (h >= 0 && h <= 23) {
      if (h < 11) return "8am - 11am";
      if (h < 14) return "11am - 2pm";
      return "2pm - 5pm";
    }
  }

  return null;
}

export function normalizeWeekday(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= 6) {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (/^[0-6]$/.test(trimmed)) return Number(trimmed);
    if (trimmed.startsWith("sun")) return 0;
    if (trimmed.startsWith("mon")) return 1;
    if (trimmed.startsWith("tue")) return 2;
    if (trimmed.startsWith("wed")) return 3;
    if (trimmed.startsWith("thu")) return 4;
    if (trimmed.startsWith("fri")) return 5;
    if (trimmed.startsWith("sat")) return 6;
  }
  return null;
}

function isSingleDayService(svc: unknown, billing: unknown): boolean {
  if (billing === "oneoff") return true;
  const s = String(svc || "").toLowerCase();
  return s.includes("deep") || s.includes("move-in") || s.includes("move-out") || s.includes("fumigation");
}

export interface GenerateVisitsParams {
  billing?: unknown;
  svc?: unknown;
  freq?: unknown;
  sessions?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  visitDays?: unknown;
  visitSlot?: unknown;
}

export function generateScheduledVisits(params: GenerateVisitsParams): ScheduledVisit[] {
  if (!isValidIsoDate(params.startDate)) return [];
  const startDate = params.startDate.trim();
  const baseSlot = normalizeSlot(params.visitSlot);
  if (!baseSlot) return [];

  const singleDay = isSingleDayService(params.svc, params.billing);
  const endDate =
    isValidIsoDate(params.endDate) && params.endDate.trim() >= startDate
      ? params.endDate.trim()
      : startDate;

  if (singleDay || endDate === startDate) {
    const startWd = weekdayOfIsoDate(startDate);
    return [{ date: startDate, slot: startWd === 0 ? SUNDAY_ONLY_SLOT : baseSlot }];
  }

  const rawDays = Array.isArray(params.visitDays) ? params.visitDays : [];
  const daysSet = new Set<number>();
  for (const d of rawDays) {
    const n = normalizeWeekday(d);
    if (n !== null) daysSet.add(n);
  }
  if (daysSet.size === 0) {
    const startWd = weekdayOfIsoDate(startDate);
    if (startWd !== null) daysSet.add(startWd);
  }

  const parsedSessions = Number(params.sessions);
  const maxSessions =
    Number.isFinite(parsedSessions) && parsedSessions > 0
      ? Math.min(31, Math.floor(parsedSessions))
      : 31;

  const isBiweekly = String(params.freq || "").toLowerCase().includes("two weeks");
  const startMs = isoDateToUtcMs(startDate);
  const endMs = isoDateToUtcMs(endDate);
  const maxSpanDays = Math.min(62, Math.floor((endMs - startMs) / MS_PER_DAY));

  const out: ScheduledVisit[] = [];
  let firstMatchMs: number | null = null;

  for (let offset = 0; offset <= maxSpanDays; offset++) {
    const curMs = startMs + offset * MS_PER_DAY;
    const wd = new Date(curMs).getUTCDay();
    if (!daysSet.has(wd)) continue;

    if (isBiweekly) {
      if (firstMatchMs === null) firstMatchMs = curMs;
      const weeksSinceFirst = Math.floor((curMs - firstMatchMs) / (7 * MS_PER_DAY));
      if (weeksSinceFirst % 2 !== 0) continue;
    }

    const slotForDay: CanonicalSlot = wd === 0 ? SUNDAY_ONLY_SLOT : baseSlot;
    out.push({ date: utcMsToIsoDate(curMs), slot: slotForDay });
    if (out.length >= maxSessions) break;
  }

  return out;
}

/**
 * Resolves all active calendar visits registered by a saved invoice's JSON state.
 * Respects `reserveCalendar === false` opt-out and deduplicates identical (date, slot)
 * pairs within a single invoice while validating inputs strictly.
 */
export function expandInvoiceVisits(
  data: Record<string, unknown> | null | undefined,
  options?: { includeUnreserved?: boolean }
): ScheduledVisit[] {
  if (!data || typeof data !== "object") return [];
  if (!options?.includeUnreserved && data.reserveCalendar === false) return [];

  const fallbackSlot = normalizeSlot(data.visitSlot);
  const explicit = data.scheduledVisits;

  if (Array.isArray(explicit) && explicit.length > 0) {
    const seen = new Set<string>();
    const visits: ScheduledVisit[] = [];

    for (const raw of explicit) {
      let dateStr: unknown = null;
      let rawSlot: unknown = fallbackSlot;

      if (typeof raw === "string") {
        dateStr = raw;
      } else if (raw && typeof raw === "object") {
        const entry = raw as Record<string, unknown>;
        dateStr = entry.date;
        rawSlot = entry.slot ?? fallbackSlot;
      }

      if (!isValidIsoDate(dateStr)) continue;
      const slot = normalizeSlot(rawSlot);
      if (!slot) continue;

      const cleanDate = dateStr.trim();
      const key = `${cleanDate}|${slot}`;
      if (seen.has(key)) continue;
      seen.add(key);
      visits.push({ date: cleanDate, slot });
    }

    visits.sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot));
    return visits;
  }

  return generateScheduledVisits({
    billing: data.billing,
    svc: data.svc,
    freq: data.freq,
    sessions: data.sessions,
    startDate: data.startDate,
    endDate: data.endDate,
    visitDays: data.visitDays,
    visitSlot: data.visitSlot,
  });
}

export function lagosTodayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function lagosMonthStartIso(now = new Date()): string {
  return `${lagosTodayIso(now).slice(0, 7)}-01`;
}

export function toLagosDateAndSlot(isoTimestamp: string): ScheduledVisit | null {
  const dt = new Date(isoTimestamp);
  if (Number.isNaN(dt.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(dt);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const date = `${map.year}-${map.month}-${map.day}`;
  if (!isValidIsoDate(date)) return null;

  const hour = Number(map.hour) % 24;
  const slot: CanonicalSlot =
    hour < 11 ? "8am - 11am" : hour < 14 ? "11am - 2pm" : "2pm - 5pm";
  return { date, slot };
}

export function summariseInvoiceSchedule(data: Record<string, unknown> | null | undefined) {
  const visits = expandInvoiceVisits(data);
  const reservedOnCalendar = Boolean(data && data.reserveCalendar !== false && visits.length > 0);

  const uniqueSlots = Array.from(new Set(visits.map((v) => v.slot)));
  const slotLabel =
    uniqueSlots.length === 1
      ? uniqueSlots[0]
      : uniqueSlots.length > 1
        ? uniqueSlots.join(" / ")
        : normalizeSlot(data?.visitSlot) ?? "";

  const weekdays = new Set<number>();
  if (Array.isArray(data?.visitDays)) {
    for (const d of data.visitDays) {
      const wd = normalizeWeekday(d);
      if (wd !== null) weekdays.add(wd);
    }
  }
  if (weekdays.size === 0) {
    for (const v of visits) {
      const wd = weekdayOfIsoDate(v.date);
      if (wd !== null) weekdays.add(wd);
    }
  }
  const orderedWeekdays = [1, 2, 3, 4, 5, 6, 0].filter((d) => weekdays.has(d));
  const daysLabel =
    visits.length <= 1 && visits[0]
      ? DAY_SHORT[weekdayOfIsoDate(visits[0].date) ?? 0]
      : orderedWeekdays.length > 0
        ? orderedWeekdays.map((d) => DAY_PLURAL[d]).join(", ")
        : "";

  return {
    visits,
    visitCount: visits.length,
    reservedOnCalendar,
    slotLabel,
    daysLabel,
  };
}
