/**
 * Deployment-readiness predicate (Blueprint §10.1 eligibility, Stage 4 exit
 * criterion). A cleaner may enter the dispatch pool / go AVAILABLE only when
 * ACTIVE + verified + deployment-ready. Pure and dependency-free so it is unit
 * tested and reused by both the availability gate and the eligibility query.
 */
export interface ReadinessInput {
  account_status: string;
  verified: boolean;
  deployment_ready: boolean;
}

export function isDeploymentReady(c: ReadinessInput): boolean {
  return c.account_status === "ACTIVE" && c.verified === true && c.deployment_ready === true;
}
