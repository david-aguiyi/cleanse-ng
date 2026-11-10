import { describe, it, expect } from "vitest";
import {
  getApplicantSelectionMessage,
  buildApplicantWhatsAppUrl,
  getTimeOfDayGreeting,
} from "@app/admin/applicants/applicant-message";

describe("applicant selection message", () => {
  it("interpolates applicant full name and custom greeting", () => {
    const msg = getApplicantSelectionMessage("Blessing Adebayo", "Good afternoon");
    expect(msg).toContain(
      "Good afternoon Blessing Adebayo, this is the General Operations Manager at Cleanse.ng. I am reaching out to you directly regarding the application you submitted on our website."
    );
    expect(msg).toContain("You recently filled our online form to join us as a Cleanse Pro.");
    expect(msg).toContain("You are paid for every job you do, not a monthly salary.");
    expect(msg).toContain("flyer's ₦90,000 a month");
    expect(msg).toContain("reply YES");
    expect(msg).toContain("Cleanse.ng");
  });

  it("handles missing or whitespace-only name gracefully", () => {
    const msg = getApplicantSelectionMessage("   ", "Good morning");
    expect(msg).toContain(
      "Good morning, this is the General Operations Manager at Cleanse.ng. I am reaching out to you directly regarding the application you submitted on our website."
    );
  });

  it("builds a valid wa.me URL with prefilled URL-encoded text", () => {
    const url = buildApplicantWhatsAppUrl("+234 801 234 5678", "Blessing Adebayo", "Good morning");
    expect(url.startsWith("https://wa.me/2348012345678?text=")).toBe(true);
    expect(url).toContain(
      encodeURIComponent(
        "Good morning Blessing Adebayo, this is the General Operations Manager at Cleanse.ng. I am reaching out to you directly regarding the application you submitted on our website."
      )
    );
  });

  it("resolves time of day greeting correctly", () => {
    // 09:00 Lagos time
    const morning = new Date("2026-11-10T08:00:00Z"); // UTC 08:00 = 09:00 Lagos
    expect(getTimeOfDayGreeting(morning)).toBe("Good morning");

    // 14:00 Lagos time
    const afternoon = new Date("2026-11-10T13:00:00Z"); // UTC 13:00 = 14:00 Lagos
    expect(getTimeOfDayGreeting(afternoon)).toBe("Good afternoon");

    // 19:00 Lagos time
    const evening = new Date("2026-11-10T18:00:00Z"); // UTC 18:00 = 19:00 Lagos
    expect(getTimeOfDayGreeting(evening)).toBe("Good evening");
  });
});
