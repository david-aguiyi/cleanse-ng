import { describe, it, expect } from "vitest";
import { naira, waDigits, humanEvent } from "@app/admin/format";

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
});
