import { describe, it, expect } from "vitest";
import { naira, waDigits, humanEvent, shortDate } from "@app/admin/format";

describe("admin format helpers", () => {
  it("formats kobo as naira", () => {
    expect(naira(1700000)).toBe("₦17,000");
  });

  it("strips non-digits for wa.me links", () => {
    expect(waDigits("+234 801 234 5678")).toBe("2348012345678");
    expect(waDigits("")).toBe("");
  });

  it("humanises event types", () => {
    expect(humanEvent("booking.confirmed")).toBe("Booking Confirmed");
    expect(humanEvent("cleaner.on_the_way")).toBe("Cleaner On The Way");
  });

  it("formats ISO date to short date string", () => {
    expect(shortDate("2026-11-05")).toBe("5 Nov 2026");
    expect(shortDate("2026-01-31")).toBe("31 Jan 2026");
    expect(shortDate(null)).toBe("—");
  });
});
