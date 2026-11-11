import { describe, it, expect } from "vitest";
import {
  normalizeSlot,
  generateScheduledVisits,
  expandInvoiceVisits,
  toLagosDateAndSlot,
  summariseInvoiceSchedule,
} from "../../src/domain/invoice/schedule";
import { invoiceSaveSchema } from "../../src/validation/schemas";

describe("Invoice & Calendar Schedule Helpers", () => {
  it("normalizes canonical and freeform slot strings safely", () => {
    expect(normalizeSlot("8am - 11am")).toBe("8am - 11am");
    expect(normalizeSlot("8am–11am")).toBe("8am - 11am");
    expect(normalizeSlot("morning")).toBe("8am - 11am");
    expect(normalizeSlot("09:30")).toBe("8am - 11am");

    expect(normalizeSlot("11am - 2pm")).toBe("11am - 2pm");
    expect(normalizeSlot("midday")).toBe("11am - 2pm");
    expect(normalizeSlot("12:00")).toBe("11am - 2pm");
    expect(normalizeSlot("afternoon")).toBe("11am - 2pm");

    expect(normalizeSlot("2pm - 5pm")).toBe("2pm - 5pm");
    expect(normalizeSlot("14:00")).toBe("2pm - 5pm");
    expect(normalizeSlot("evening")).toBe("2pm - 5pm");

    expect(normalizeSlot("")).toBeNull();
    expect(normalizeSlot(null)).toBeNull();
    expect(normalizeSlot("unknown text")).toBeNull();
  });

  it("caps weekly generated visits to session count and enforces Sunday 2pm - 5pm", () => {
    // 2026-11-07..2026-12-07 contains 5 Saturdays, but a 4-session plan must reserve 4.
    const weekly = generateScheduledVisits({
      billing: "monthly",
      svc: "Residential Home Cleaning",
      freq: "Once weekly",
      sessions: 4,
      startDate: "2026-11-07",
      endDate: "2026-12-07",
      visitDays: [6], // Saturday
      visitSlot: "8am - 11am",
    });
    expect(weekly).toEqual([
      { date: "2026-11-07", slot: "8am - 11am" },
      { date: "2026-11-14", slot: "8am - 11am" },
      { date: "2026-11-21", slot: "8am - 11am" },
      { date: "2026-11-28", slot: "8am - 11am" },
    ]);

    // Sunday single-day booking auto-maps to the Sunday 2pm - 5pm window.
    const sundayOneOff = generateScheduledVisits({
      billing: "oneoff",
      svc: "Deep Cleaning",
      startDate: "2026-11-15", // Sunday
      endDate: "2026-11-15",
      visitSlot: "8am - 11am",
    });
    expect(sundayOneOff).toEqual([{ date: "2026-11-15", slot: "2pm - 5pm" }]);
  });

  it("supports biweekly parity and mixed weekday/Sunday monthly schedules", () => {
    const biweekly = generateScheduledVisits({
      billing: "monthly",
      svc: "Residential Home Cleaning",
      freq: "Every two weeks",
      sessions: 2,
      startDate: "2026-11-07",
      endDate: "2026-12-07",
      visitDays: [6],
      visitSlot: "11am - 2pm",
    });
    expect(biweekly).toEqual([
      { date: "2026-11-07", slot: "11am - 2pm" },
      { date: "2026-11-21", slot: "11am - 2pm" },
    ]);

    const mixed = generateScheduledVisits({
      billing: "monthly",
      svc: "Residential Home Cleaning",
      freq: "Twice weekly",
      sessions: 4,
      startDate: "2026-11-14", // Sat
      endDate: "2026-11-30",
      visitDays: [1, 0], // Mon + Sun
      visitSlot: "8am - 11am",
    });
    expect(mixed).toEqual([
      { date: "2026-11-15", slot: "2pm - 5pm" },
      { date: "2026-11-16", slot: "8am - 11am" },
      { date: "2026-11-22", slot: "2pm - 5pm" },
      { date: "2026-11-23", slot: "8am - 11am" },
    ]);
  });

  it("respects reserveCalendar opt-out and deduplicates explicit visits", () => {
    expect(
      expandInvoiceVisits({
        reserveCalendar: false,
        visitSlot: "8am - 11am",
        scheduledVisits: [{ date: "2026-11-14", slot: "8am - 11am" }],
      })
    ).toEqual([]);

    const expanded = expandInvoiceVisits({
      reserveCalendar: true,
      visitSlot: "8am - 11am",
      scheduledVisits: [
        { date: "2026-11-21", slot: "11am - 2pm" },
        { date: "2026-11-14", slot: "8am - 11am" },
        { date: "2026-11-14", slot: "8am - 11am" }, // duplicate
        { date: "invalid-date", slot: "8am - 11am" },
      ],
    });
    expect(expanded).toEqual([
      { date: "2026-11-14", slot: "8am - 11am" },
      { date: "2026-11-21", slot: "11am - 2pm" },
    ]);
  });

  it("maps UTC timestamps accurately into Africa/Lagos calendar dates and slots", () => {
    expect(toLagosDateAndSlot("2026-11-14T07:00:00Z")).toEqual({
      date: "2026-11-14",
      slot: "8am - 11am",
    });
    expect(toLagosDateAndSlot("2026-11-14T10:00:00Z")).toEqual({
      date: "2026-11-14",
      slot: "11am - 2pm",
    });
    expect(toLagosDateAndSlot("2026-11-14T13:00:00Z")).toEqual({
      date: "2026-11-14",
      slot: "2pm - 5pm",
    });
    // 23:30 UTC is 00:30 the following day in Africa/Lagos (+01:00)
    expect(toLagosDateAndSlot("2026-11-14T23:30:00Z")).toEqual({
      date: "2026-11-15",
      slot: "8am - 11am",
    });
  });

  it("summarises schedule labels and validates invoice save payload", () => {
    const summary = summariseInvoiceSchedule({
      reserveCalendar: true,
      billing: "monthly",
      visitDays: [1, 4],
      visitSlot: "11am - 2pm",
      scheduledVisits: [
        { date: "2026-11-16", slot: "11am - 2pm" },
        { date: "2026-11-19", slot: "11am - 2pm" },
      ],
    });
    expect(summary.reservedOnCalendar).toBe(true);
    expect(summary.visitCount).toBe(2);
    expect(summary.daysLabel).toBe("Mondays, Thursdays");
    expect(summary.slotLabel).toBe("11am - 2pm");

    const parsed = invoiceSaveSchema.parse({
      data: {
        client: "Ade",
        addr: "Bodija",
        items: [{ d: "Cleaning", a: 45000 }],
        reserveCalendar: true,
        visitSlot: "8am - 11am",
        visitDays: [6],
        scheduledVisits: [{ date: "2026-11-14", slot: "8am - 11am" }],
      },
    });
    expect(parsed.data.reserveCalendar).toBe(true);
    expect(parsed.data.scheduledVisits).toHaveLength(1);
  });
});

