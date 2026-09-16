# Operations Runbooks (Blueprint §20.2)

## Runbook: paid booking not assigned
1. Open the booking in the admin control centre; confirm **payment SUCCESS / customer CONFIRMED**.
2. Check dispatch: candidate count, offers by round, push/SMS provider status (booking timeline + notifications).
3. **Rebroadcast** to additional eligible cleaners, or manually call/assign a verified cleaner.
4. If the original winner failed, **Reassign** first (closes the assignment as REASSIGNED, keeps history) before assigning another cleaner.
5. Revoke any existing customer share card and generate a new one for the replacement (Reassign does this automatically).
6. Contact the customer manually only when operationally appropriate — never expose internal shortage mechanics.
7. Add an operations note with the reason so supply planning can analyze the failure later.

## Runbook: payment finalization failure
1. Find the `payments` row by provider reference; check `status` and `provider_payload`.
2. Re-run verification: replay the webhook, or hit the callback URL with the reference. Finalization is idempotent.
3. If Paystack shows success but the booking is not CONFIRMED, check logs for `AMOUNT_MISMATCH` / verification errors.
4. Never manually flip a booking to CONFIRMED without a verified Paystack success.

## Runbook: SMS wallet low / provider errors
1. Watch the low-balance alert; top up the BulkSMSNigeria wallet.
2. Push remains primary; SMS is fallback — dispatch still functions on push alone.
3. If the provider is down, switch `SMS_PROVIDER` (adapter swap) once a Termii implementation is added.

## Runbook: mass FCM invalid-token spike
1. Invalid tokens are auto-marked inactive by the push gateway; dispatch falls back to SMS.
2. If widespread, verify the Firebase service account + VAPID key have not rotated.

## Runbook: production recovery
1. Restore the most recent daily backup to a new Supabase project.
2. Re-point `NEXT_PUBLIC_SUPABASE_URL` / keys; re-run any migrations newer than the backup.
3. Reconcile payments against Paystack before resuming dispatch.
