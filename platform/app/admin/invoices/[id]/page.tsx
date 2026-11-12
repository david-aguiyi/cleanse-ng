import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getInvoice } from "@/domain/invoice/invoice-service";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import AdminShell from "../../_components/AdminShell";
import MakerFrame from "./MakerFrame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /admin/invoices/new opens a blank invoice; /admin/invoices/{id} opens a saved one.
export default async function InvoiceEditor({ params }: { params: { id: string } }) {
  const admin = await getAdminContext();
  if (!admin) redirect(`/admin/login?next=/admin/invoices/${params.id}`);

  let invoice: { id: string; invoice_number: string } | null = null;
  let linkedJob: { id: string; status: string } | null = null;

  if (params.id !== "new") {
    try {
      invoice = await getInvoice(params.id);
    } catch (err) {
      if (err instanceof AppError && err.code === "INVOICE_NOT_FOUND") notFound();
      throw err;
    }
    try {
      const { data: jobRow } = await serviceClient()
        .from("invoice_jobs")
        .select("id, status")
        .eq("invoice_id", invoice.id)
        .maybeSingle();
      if (jobRow) linkedJob = jobRow as { id: string; status: string };
    } catch {
      linkedJob = null;
    }
  }

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="invoices"
      breadcrumbs={[
        { label: "Invoices", href: "/admin/invoices" },
        { label: invoice ? invoice.invoice_number : "New Invoice" },
      ]}
    >
      <MakerFrame
        initialId={invoice?.id ?? null}
        initialNumber={invoice?.invoice_number ?? null}
        initialJobId={linkedJob?.id ?? null}
        initialJobStatus={linkedJob?.status ?? null}
      />
    </AdminShell>
  );
}
