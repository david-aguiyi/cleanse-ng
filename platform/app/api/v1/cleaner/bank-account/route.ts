import { NextRequest } from "next/server";
import { requireCleaner } from "@/auth/cleaner";
import {
  getCleanerBankAccount,
  upsertCleanerBankAccount,
} from "@/domain/payout/payout-service";
import { cleanerBankAccountSchema } from "@/validation/schemas";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/cleaner/bank-account — fetch signed-in Cleanse Pro's payout bank details.
export async function GET(_req: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireCleaner();
    const res = await getCleanerBankAccount(ctx.cleanerId);
    return ok(res, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

// PUT /api/v1/cleaner/bank-account — save/update bank name, 10-digit account number, account name.
export async function PUT(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const ctx = await requireCleaner();
    const input = cleanerBankAccountSchema.parse(await req.json());
    const bankAccount = await upsertCleanerBankAccount(ctx.cleanerId, input);
    return ok({ bankAccount }, requestId);
  } catch (err) {
    return handleError(err, requestId);
  }
}

