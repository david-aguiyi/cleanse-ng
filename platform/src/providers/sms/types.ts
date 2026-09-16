/**
 * Provider-neutral SMS interface (Blueprint §9.4, Appendix B.2). BulkSMSNigeria
 * is the first implementation; Termii can be swapped in behind this adapter
 * without changing DispatchService.
 */
export interface SmsSendInput {
  toE164: string;
  senderId: string;
  body: string;
  callbackUrl?: string;
  clientReference: string;
}

export interface SmsSendResult {
  providerMessageId: string;
  accepted: boolean;
  estimatedCostMinor?: number; // kobo, where the provider reports it
  raw?: unknown;
}

export interface SmsProvider {
  readonly name: string;
  send(input: SmsSendInput): Promise<SmsSendResult>;
}
