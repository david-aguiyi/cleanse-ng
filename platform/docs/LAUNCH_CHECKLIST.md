# Production Go-Live Checklist (Blueprint §20.1)

Work top to bottom; do not launch with an unchecked item.

## Payments
- [ ] Paystack **live** keys set (`PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`), server-only.
- [ ] Live webhook `POST {APP_URL}/api/v1/webhooks/paystack` configured on the HTTPS production URL.
- [ ] Signature verification + transaction verify tested end-to-end (status/reference/amount/currency).
- [ ] Duplicate `charge.success` replay produces exactly one confirmation (idempotency).

## Push & SMS
- [ ] Firebase **production** project; service worker deployed; Android Chrome + iPhone Home-Screen push tested.
- [ ] `FIREBASE_*` server creds + `NEXT_PUBLIC_FIREBASE_*` + VAPID key set.
- [ ] SMS sender ID approved; production wallet funded; low-balance alert configured.
- [ ] SMS delivery callback tested; `SMS_DELIVERY_CALLBACK_SECRET` set.

## Data & auth
- [ ] Migrations `0001`–`0004` applied to production; seed reviewed against approved pricing.
- [ ] Supabase RLS/grants audited; **service role exists only in the server environment**.
- [ ] `ADMIN_MFA_REQUIRED=true`; at least two authorized operations admins enrolled with MFA.
- [ ] Zones configured; unserviceable addresses cannot reach payment.
- [ ] 20% service fee (`service_fee_bps=2000`) verified against the approved Cleanse pricing table.

## Dispatch & reliability
- [ ] Inngest production keys set (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`); `/api/inngest` reachable.
- [ ] Paid-unassigned SLA alert reaches a real operations person.
- [ ] Concurrency acceptance test + duplicate-webhook test passed in staging.

## Legal & ops
- [ ] Privacy policy / terms / cancellation language linked before payment.
- [ ] Daily database backups enabled; recovery procedure documented and tested.
- [ ] Sentry DSN set; error + provider-failure alerts routed to on-call.
- [ ] Cleaner onboarding checklist includes PWA install + notification permission + availability test.
