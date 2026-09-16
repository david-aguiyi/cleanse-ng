/**
 * Sentry capture seam (Blueprint §15.1). Kept dependency-optional: if
 * `@sentry/nextjs` is installed and `SENTRY_DSN` is set, exceptions are
 * forwarded; otherwise this degrades to a structured error log so nothing
 * breaks when Sentry is not configured.
 */
import { logger } from "./logger";

type SentryModule = { captureException?: (e: unknown, hint?: unknown) => void } | false;
let sentry: SentryModule | null = null;

async function load(): Promise<SentryModule> {
  if (sentry !== null) return sentry;
  try {
    // Optional dependency — resolved only if the user has installed it. The
    // specifier is held in a variable so TS/bundlers do not require it to exist.
    const spec = "@sentry/nextjs";
    sentry = (await import(/* webpackIgnore: true */ spec)) as SentryModule;
  } catch {
    sentry = false;
  }
  return sentry;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!process.env.SENTRY_DSN) return;
  void load().then((s) => {
    if (s && s.captureException) s.captureException(err, { extra: context });
    else logger.error("sentry.capture (forward via log drain)", { error: String(err), ...context });
  });
}
