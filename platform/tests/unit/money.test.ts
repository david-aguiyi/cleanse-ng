import { describe, it, expect } from "vitest";
import { formatNairaFromKobo } from "@/lib/money";

describe("formatNairaFromKobo", () => {
  it("formats the seeded regular-cleaning prices (Appendix A.3)", () => {
    expect(formatNairaFromKobo(900000)).toBe("₦9,000");
    expect(formatNairaFromKobo(1300000)).toBe("₦13,000");
    expect(formatNairaFromKobo(1700000)).toBe("₦17,000");
    expect(formatNairaFromKobo(2000000)).toBe("₦20,000");
    expect(formatNairaFromKobo(2500000)).toBe("₦25,000");
  });

  it("handles zero", () => {
    expect(formatNairaFromKobo(0)).toBe("₦0");
  });
});
