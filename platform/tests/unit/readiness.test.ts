import { describe, it, expect } from "vitest";
import { isDeploymentReady } from "@/domain/cleaner/readiness";

describe("isDeploymentReady (Stage 4 availability gate)", () => {
  it("is true only when ACTIVE + verified + deployment_ready", () => {
    expect(
      isDeploymentReady({ account_status: "ACTIVE", verified: true, deployment_ready: true })
    ).toBe(true);
  });

  it("is false for any missing condition", () => {
    expect(
      isDeploymentReady({ account_status: "ONBOARDING", verified: true, deployment_ready: true })
    ).toBe(false);
    expect(
      isDeploymentReady({ account_status: "ACTIVE", verified: false, deployment_ready: true })
    ).toBe(false);
    expect(
      isDeploymentReady({ account_status: "ACTIVE", verified: true, deployment_ready: false })
    ).toBe(false);
    expect(
      isDeploymentReady({ account_status: "SUSPENDED", verified: true, deployment_ready: true })
    ).toBe(false);
  });
});
