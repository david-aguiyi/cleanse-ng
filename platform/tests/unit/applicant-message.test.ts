import { describe, it, expect } from "vitest";
import { getApplicantSelectionMessage, buildApplicantWhatsAppUrl } from "@app/admin/applicants/applicant-message";

describe("applicant selection message", () => {
  it("interpolates applicant full name in greeting", () => {
    const msg = getApplicantSelectionMessage("Blessing Adebayo");
    expect(msg).toContain("Good day Blessing Adebayo, this is Cleanse.ng.");
    expect(msg).toContain("You recently filled our online form to join us as a Cleanse Pro.");
    expect(msg).toContain("You are paid for every job you do, not a monthly salary.");
    expect(msg).toContain("flyer's ₦90,000 a month");
    expect(msg).toContain("reply YES");
    expect(msg).toContain("Cleanse.ng");
  });

  it("handles missing or whitespace-only name gracefully", () => {
    const msg = getApplicantSelectionMessage("   ");
    expect(msg).toContain("Good day, this is Cleanse.ng.");
  });

  it("builds a valid wa.me URL with prefilled URL-encoded text", () => {
    const url = buildApplicantWhatsAppUrl("+234 801 234 5678", "Blessing Adebayo");
    expect(url.startsWith("https://wa.me/2348012345678?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("Good day Blessing Adebayo, this is Cleanse.ng."));
    expect(url).toContain(encodeURIComponent("flyer's ₦90,000 a month"));
  });

  it("normalises local Nigerian numbers starting with 0", () => {
    const url = buildApplicantWhatsAppUrl("08012345678", "Funke");
    expect(url.startsWith("https://wa.me/2348012345678?text=")).toBe(true);
  });
});
