import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { listInvoices } from "@/domain/invoice/invoice-service";
import { lagos } from "../format";
import AdminBar from "../AdminBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export default async function AdminInvoices({ searchParams }: { searchParams: { q?: string } }) {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/invoices");

  const invoices = await listInvoices(searchParams.q);

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="invoices" />
      <div className="admin-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 className="admin-h1">Invoices</h1>
          <Link className="btn-primary" href="/admin/invoices/new" style={{ padding: "12px 20px" }}>
            + New invoice
          </Link>
        </div>

        <form className="filters" method="get">
          <input name="q" placeholder="Search number, client or address…" defaultValue={searchParams.q ?? ""} />
          <button type="submit" className="btn-ghost">
            Search
          </button>
        </form>

        <div className="board">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Total</th>
                <th>Created</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--mid-gray)" }}>
                    No saved invoices yet. Tap “New invoice” to make the first one.
                  </td>
                </tr>
              )}
              {invoices.map((inv: Record<string, any>) => (
                <tr key={inv.id}>
                  <td>
                    <Link className="ref" href={`/admin/invoices/${inv.id}`}>
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td>
                    {inv.client_name || inv.client_address || "—"}
                    {inv.client_name && inv.client_address && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {inv.client_address}
                      </div>
                    )}
                  </td>
                  <td>{naira(inv.total_naira)}</td>
                  <td>{lagos(inv.created_at)}</td>
                  <td>{inv.creator?.full_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
