import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getInvoice } from "@/domain/invoice/invoice-service";
import { AppError } from "@/http/errors";
import AdminBar from "../../AdminBar";
import MakerFrame from "./MakerFrame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /admin/invoices/new opens a blank invoice; /admin/invoices/{id} a saved one.
export default async function InvoiceEditor({ params }: { params: { id: string } }) {
  const admin = await getAdminContext();
  if (!admin) redirect(`/admin/login?next=/admin/invoices/${params.id}`);

  let invoice: { id: string; invoice_number: string } | null = null;
  if (params.id !== "new") {
    try {
      invoice = await getInvoice(params.id);
    } catch (err) {
      if (err instanceof AppError && err.code === "INVOICE_NOT_FOUND") notFound();
      throw err;
    }
  }

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="invoices" />
      <div className="admin-wrap">
        <p className="muted">
          <Link href="/admin/invoices">← All invoices</Link>
        </p>
        <MakerFrame initialId={invoice?.id ?? null} initialNumber={invoice?.invoice_number ?? null} />
      </div>
    </main>
  );
}
