import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext } from "@/auth/admin";
import { getInvoice, latestInvoiceDefaults } from "@/domain/invoice/invoice-service";
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
  let boot: { id: string | null; num: string | null; data: unknown; defaults?: unknown } = {
    id: null,
    num: null,
    data: null,
  };
  if (!id) {
    boot.defaults = await latestInvoiceDefaults();
  } else {
    try {
      const inv = await getInvoice(id);
      boot = { id: inv.id, num: inv.invoice_number, data: inv.data };
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
