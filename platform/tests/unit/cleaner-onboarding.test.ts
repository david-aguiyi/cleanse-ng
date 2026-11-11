import { describe, it, expect } from "vitest";
import { cleanerOnboardingSchema } from "../../src/validation/schemas";
import { AGREEMENT_CLAUSES, NOTICE_DAYS } from "../../app/pro/onboard/clauses";

const validPayload = {
  full_name: "Adebayo Blessing Oluwaseun",
  photo_url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
  whatsapp: "08031234567",
  date_of_birth: "1998-05-14",
  gender: "Female" as const,
  nin_digits: "12345678901",
  nin_document_url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",

  street_address: "14 Adebayo Street",
  landmark: "Opposite Total Filling Station",
  neighbourhood: "Agbowo",
  lga: "Ibadan North",
  city_state: "Ibadan, Oyo State",
  closest_zone: "Bodija" as const,
  transport_mode: "Bus / Danfo" as const,
  travel_time_hub: "20 to 40 minutes",

  education_level: "SSCE / WAEC / NECO",
  languages: ["Yoruba", "English"],
  available_days: ["Monday", "Wednesday", "Friday"],
  early_morning_ok: true,
  pair_work_ok: true,
  start_readiness: "Immediately",

  guarantor_name: "Pastor Tunde Bakare",
  guarantor_phone: "08023456789",
  guarantor_relationship: "Pastor",
  emergency_name: "Mrs. Grace Adebayo",
  emergency_phone: "08051112222",
  emergency_relationship: "Mother",

  agreed_clauses: AGREEMENT_CLAUSES.map((c) => c.id),
  agreement_version: "v1.0",
};

describe("Cleanse Pro Onboarding & Agreement", () => {
  it("defines 19 agreement clauses with 5 days notice in clause 18", () => {
    expect(AGREEMENT_CLAUSES).toHaveLength(19);
    expect(NOTICE_DAYS).toBe(5);
    const clause18 = AGREEMENT_CLAUSES.find((c) => c.id === 18);
    expect(clause18?.text).toContain("5 days' notice");
  });

  it("validates a complete submission and normalizes Nigerian phones", () => {
    const parsed = cleanerOnboardingSchema.parse(validPayload);
    expect(parsed.whatsapp).toBe("+2348031234567");
    expect(parsed.guarantor_phone).toBe("+2348023456789");
    expect(parsed.emergency_phone).toBe("+2348051112222");
    expect(parsed.nin_digits).toBe("12345678901");
  });

  it("rejects invalid NIN (must be 11 digits)", () => {
    expect(() =>
      cleanerOnboardingSchema.parse({ ...validPayload, nin_digits: "12345" })
    ).toThrow();
    expect(() =>
      cleanerOnboardingSchema.parse({ ...validPayload, nin_digits: "1234567890a" })
    ).toThrow();
  });

  it("rejects submission if not all 19 distinct clauses are agreed", () => {
    expect(() =>
      cleanerOnboardingSchema.parse({
        ...validPayload,
        agreed_clauses: AGREEMENT_CLAUSES.slice(0, 18).map((c) => c.id),
      })
    ).toThrow(/all 19 clauses/);

    expect(() =>
      cleanerOnboardingSchema.parse({
        ...validPayload,
        agreed_clauses: Array(19).fill(1),
      })
    ).toThrow(/all 19 clauses/);
  });
});
