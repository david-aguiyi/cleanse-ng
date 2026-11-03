import { describe, it, expect } from "vitest";
import { parseNigerianPhone } from "../../src/domain/settings/phone-format";

describe("parseNigerianPhone", () => {
  it("parses standard 11-digit Nigerian mobile numbers", () => {
    const res = parseNigerianPhone("09130663739");
    expect(res).not.toBeNull();
    expect(res?.raw).toBe("09130663739");
    expect(res?.digits).toBe("2349130663739");
    expect(res?.international).toBe("+2349130663739");
    expect(res?.display).toBe("+234 913 066 3739");
    expect(res?.localDisplay).toBe("0913 066 3739");
    expect(res?.waUrl).toBe("https://wa.me/2349130663739");
  });

  it("handles numbers with spaces and formatting", () => {
    const res = parseNigerianPhone("+234 913 066 3739");
    expect(res).not.toBeNull();
    expect(res?.digits).toBe("2349130663739");
    expect(res?.display).toBe("+234 913 066 3739");
    expect(res?.localDisplay).toBe("0913 066 3739");
  });

  it("handles international format without spaces", () => {
    const res = parseNigerianPhone("+2349130663739");
    expect(res).not.toBeNull();
    expect(res?.raw).toBe("09130663739");
    expect(res?.digits).toBe("2349130663739");
  });

  it("handles 10-digit without leading zero", () => {
    const res = parseNigerianPhone("9130663739");
    expect(res).not.toBeNull();
    expect(res?.raw).toBe("09130663739");
    expect(res?.digits).toBe("2349130663739");
  });

  it("rejects invalid or incomplete numbers", () => {
    expect(parseNigerianPhone("")).toBeNull();
    expect(parseNigerianPhone("12345")).toBeNull();
    expect(parseNigerianPhone("081677342")).toBeNull(); // 9 digits
    expect(parseNigerianPhone("+12025550123")).toBeNull(); // US number
  });
});
