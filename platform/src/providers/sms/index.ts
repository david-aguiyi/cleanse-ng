/**
 * SMS provider factory (Blueprint §9.4). Selects the provider from SMS_PROVIDER
 * so operations can switch vendors without a code change.
 */
import "server-only";
import type { SmsProvider } from "./types";
import { BulkSmsNigeriaProvider } from "./bulksmsnigeria";

export * from "./types";

export function smsConfigured(): boolean {
  return Boolean(process.env.BULKSMSNIGERIA_API_TOKEN);
}

export function getSmsProvider(): SmsProvider | null {
  const which = (process.env.SMS_PROVIDER ?? "bulksmsnigeria").toLowerCase();
  if (which === "bulksmsnigeria") {
    const token = process.env.BULKSMSNIGERIA_API_TOKEN;
    if (!token) return null;
    return new BulkSmsNigeriaProvider(token);
  }
  // Future: TermiiProvider behind the same interface.
  return null;
}

export const smsSenderId = () => process.env.SMS_SENDER_ID ?? "CLEANSE";
