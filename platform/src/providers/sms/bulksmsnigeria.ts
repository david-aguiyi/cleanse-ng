/**
 * BulkSMSNigeria SMS provider (Blueprint §9.4, Appendix C). REST endpoint,
 * bearer-token auth, delivery callback support. The exact response schema is
 * provider-specific and may change — parse defensively and recheck the vendor
 * docs before production (Appendix C).
 */
import "server-only";
import type { SmsProvider, SmsSendInput, SmsSendResult } from "./types";

const BASE_URL = "https://www.bulksmsnigeria.com";

export class BulkSmsNigeriaProvider implements SmsProvider {
  readonly name = "bulksmsnigeria";
  constructor(private readonly apiToken: string) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const res = await fetch(`${BASE_URL}/api/v1/sms/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        from: input.senderId,
        to: input.toE164.replace(/^\+/, ""),
        body: input.body,
        api_token: this.apiToken,
        gateway: "direct-refund",
        customer_reference: input.clientReference,
        callback_url: input.callbackUrl,
      }),
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as
      | { data?: { message_id?: string; id?: string }; message_id?: string }
      | null;

    const providerMessageId =
      json?.data?.message_id ?? json?.data?.id ?? json?.message_id ?? input.clientReference;

    return {
      providerMessageId: String(providerMessageId),
      accepted: res.ok,
      raw: json,
    };
  }
}
