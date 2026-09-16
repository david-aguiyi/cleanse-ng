/**
 * Structured logging. Every log line carries a request_id where available so a
 * booking can be traced across API logs, booking events and provider calls
 * (Blueprint §15.1). A Sentry adapter can be layered on later without changing
 * call sites.
 */
type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  requestId?: string;
  [key: string]: unknown;
}

function emit(level: Level, message: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...fields,
  });
  /* eslint-disable no-console -- this module is the single sanctioned console sink */
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
  /* eslint-enable no-console */
}

export const logger = {
  debug: (m: string, f?: LogFields) => emit("debug", m, f),
  info: (m: string, f?: LogFields) => emit("info", m, f),
  warn: (m: string, f?: LogFields) => emit("warn", m, f),
  error: (m: string, f?: LogFields) => emit("error", m, f),
};

/** Correlation id for a request/booking flow. */
export function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}
