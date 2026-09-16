import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/auth/admin";
import { addOperationsNote } from "@/domain/admin/admin-service";
import { ok, handleError } from "@/http/response";
import { newRequestId } from "@/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noteSchema = z.object({ note: z.string().trim().min(1).max(1000) });

// POST /api/v1/admin/bookings/{id}/notes — append a timestamped ops note.
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const { note } = noteSchema.parse(await req.json());
    const operationsNotes = await addOperationsNote(ctx.params.id, note, admin);
    return ok({ operations_notes: operationsNotes }, requestId, 201);
  } catch (err) {
    return handleError(err, requestId);
  }
}
