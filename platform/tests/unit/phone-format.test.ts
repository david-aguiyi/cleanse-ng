import { describe, it, expect } from "vitest";
import { parseNigerianPhone } from "../../src/domain/settings/phone-format";

describe("parseNigerianPhone", () => {
  it("parses standard 11-digit Nigerian mobile numbers", () => {
    const res = parseNigerianPhone("08167734221");
    expect(res).not.toBeNull();
    expect(res?.raw).toBe("08167734221");
    expect(res?.digits).toBe("2348167734221");
    expect(res?.international).toBe("+2348167734221");
    expect(res?.display).toBe("+234 816 773 4221");
    expect(res?.localDisplay).toBe("0816 773 4221");
    expect(res?.waUrl).toBe("https://wa.me/2348167734221");
  });

  it("handles numbers with spaces and formatting", () => {
    const res = parseNigerianPhone("+234 816 773 4221");
    expect(res).not.toBeNull();
    expect(res?.digits).toBe("2348167734221");
    expect(res?.display).toBe("+234 816 773 4221");
    expect(res?.localDisplay).toBe("0816 773 4221");
  });

  it("handles international format without spaces", () => {
    const res = parseNigerianPhone("+2348167734221");
    expect(res).not.toBeNull();
    expect(res?.raw).toBe("08167734221");
    expect(res?.digits).toBe("2348167734221");
  });

  it("handles 10-digit without leading zero", () => {
    const res = parseNigerianPhone("8167734221");
    expect(res).not.toBeNull();
    expect(res?.raw).toBe("08167734221");
    expect(res?.digits).toBe("2348167734221");
  });

  it("rejects invalid or incomplete numbers", () => {
    expect(parseNigerianPhone("")).toBeNull();
    expect(parseNigerianPhone("12345")).toBeNull();
    expect(parseNigerianPhone("081677342")).toBeNull(); // 9 digits
    expect(parseNigerianPhone("+12025550123")).toBeNull(); // US number
  });
});
