import { describe, it, expect } from "vitest";
import {
  naira,
  nairaAmount,
  waDigits,
  humanEvent,
  shortDate,
  humanJobStatus,
  humanVisitStatus,
  humanCleanerStatus,
  humanApplicantStatus,
  humanOnboardingStatus,
} from "@app/admin/format";

describe("admin format helpers", () => {
  it("formats kobo as naira", () => {
    expect(naira(1700000)).toBe("₦17,000");
  });

  it("formats raw naira amounts without dividing by 100", () => {
    expect(nairaAmount(17000)).toBe("₦17,000");
    expect(nairaAmount(null)).toBe("₦0");
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

  it("maps internal enum codes into plain-English status labels and tones", () => {
    expect(humanJobStatus("PENDING")).toEqual({ label: "Awaiting Payment", tone: "amber" });
    expect(humanJobStatus("ACTIVE")).toEqual({ label: "Active", tone: "green" });
    expect(humanJobStatus("ENDED")).toEqual({ label: "Completed", tone: "purple" });

    expect(humanVisitStatus("SCHEDULED")).toEqual({ label: "Upcoming", tone: "purple" });
    expect(humanVisitStatus("SERVED")).toEqual({ label: "Served", tone: "green" });

    expect(humanCleanerStatus("SUSPENDED")).toEqual({ label: "Blocked", tone: "red" });
    expect(humanCleanerStatus("ACTIVE")).toEqual({ label: "Active", tone: "green" });

    expect(humanApplicantStatus("NEW")).toEqual({ label: "New", tone: "amber" });
    expect(humanOnboardingStatus("SUBMITTED")).toEqual({ label: "Needs Review", tone: "amber" });
    expect(humanOnboardingStatus("CUSTOM_STATE")).toEqual({ label: "Custom State", tone: "neutral" });
  });
});
