import { describe, it, expect } from "vitest";
import { enforceRateLimit } from "@/http/rate-limit";
import { AppError } from "@/http/errors";

describe("enforceRateLimit", () => {
  it("allows up to the limit then throws RATE_LIMITED", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) enforceRateLimit(key, 3, 60_000);
    try {
      enforceRateLimit(key, 3, 60_000);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("RATE_LIMITED");
    }
  });

  it("resets after the window", () => {
    const key = `test-${Math.random()}`;
    enforceRateLimit(key, 1, 1); // 1ms window
    // After the window elapses the counter resets.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(() => enforceRateLimit(key, 1, 1)).not.toThrow();
        resolve();
      }, 5);
    });
  });
});
