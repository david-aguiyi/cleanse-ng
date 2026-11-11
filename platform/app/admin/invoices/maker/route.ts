import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext } from "@/auth/admin";
import {
  getInvoice,
  latestInvoiceDefaults,
  listPublicBookedSlots,
} from "@/domain/invoice/invoice-service";
import {
  isMissingJobSchemaError,
  listSelectableCleaners,
} from "@/domain/job/invoice-job-service";
import { serviceClient } from "@/db/service-client";
import { getSiteSettings } from "@/domain/settings/settings-service";
import { AppError } from "@/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /admin/invoices/maker[?id=] — the standalone invoice maker page. It holds
// Cleanse's bank details, so it lives in private/ (not public/) and is only
// served to signed-in admins (bundled via outputFileTracingIncludes).
// window.CLEANSE_INVOICE switches the maker into "saved invoices" mode: the
// number comes from the server and Save/Download store the invoice.
export async function GET(req: NextRequest) {
  const admin = await getAdminContext();
  if (!admin) {
    const login = new URL("/admin/login", req.url);
    login.searchParams.set("next", "/admin/invoices");
    return NextResponse.redirect(login);
  }

  const id = req.nextUrl.searchParams.get("id");
  // The repo is public, so bank details are never in the maker file: a new
  // invoice copies them (and deposit/materials settings) from the latest saved one.
  const [settings, availability, cleaners] = await Promise.all([
    getSiteSettings(),
    listPublicBookedSlots({ excludeInvoiceId: id }).catch(() => ({ slots: {}, generatedAt: "" })),
    listSelectableCleaners().catch(() => []),
  ]);
  let boot: {
    id: string | null;
    num: string | null;
    data: unknown;
    defaults?: unknown;
    contactPhone?: string;
    bookedSlots?: Record<string, string[]>;
    cleaners?: typeof cleaners;
    jobStatus?: string;
    cleanerIds?: string[];
  } = {
    id: null,
    num: null,
    data: null,
    contactPhone: settings.whatsapp.display,
    bookedSlots: availability.slots,
    cleaners,
  };
  if (!id) {
    boot.defaults = await latestInvoiceDefaults();
  } else {
    try {
      const inv = await getInvoice(id);
      let jobStatus: string | undefined;
      let cleanerIds: string[] | undefined;

      const { data: jobRow, error: jobErr } = await serviceClient()
        .from("invoice_jobs")
        .select("id, status")
        .eq("invoice_id", inv.id)
        .maybeSingle();

      if (!jobErr && !isMissingJobSchemaError(jobErr) && jobRow) {
        jobStatus = String(jobRow.status);
        const { data: links } = await serviceClient()
          .from("invoice_job_cleaners")
          .select("cleaner_id, slot_order")
          .eq("job_id", jobRow.id)
          .order("slot_order", { ascending: true });
        cleanerIds = (links ?? []).map((l: { cleaner_id: string }) => l.cleaner_id);
      }

      boot = {
        id: inv.id,
        num: inv.invoice_number,
        data: inv.data,
        contactPhone: settings.whatsapp.display,
        bookedSlots: availability.slots,
        cleaners,
        jobStatus,
        cleanerIds,
      };
    } catch (err) {
      if (err instanceof AppError && err.code === "INVOICE_NOT_FOUND") {
        return NextResponse.redirect(new URL("/admin/invoices", req.url));
      }
      throw err;
    }
  }

  const html = await readFile(path.join(process.cwd(), "private", "invoice-maker.html"), "utf8");
  // Escape "<" so stored text can never close the script tag.
  const bridge = `<script>window.CLEANSE_INVOICE=${JSON.stringify(boot).replace(/</g, "\\u003c")};</script>`;
  return new NextResponse(html.replace("<body>", "<body>\n" + bridge), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
