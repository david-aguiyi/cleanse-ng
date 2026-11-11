"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Embeds the invoice maker and follows it when a new invoice gets its number. */
export default function MakerFrame({
  initialId,
  initialNumber,
}: {
  initialId: string | null;
  initialNumber: string | null;
}) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState(initialId);
  const [number, setNumber] = useState(initialNumber);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = initialId ? `/admin/invoices/maker?id=${initialId}` : "/admin/invoices/maker";

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const m = e.data as { type?: string; id?: string; num?: string };
      if (m?.type !== "cleanse-invoice-saved" || !m.id) return;
      setInvoiceId(m.id);
      setNumber(m.num ?? null);
      window.history.replaceState(null, "", `/admin/invoices/${m.id}`);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function handleDelete() {
    if (!invoiceId || deleting) return;
    if (!window.confirm(`Delete ${number ?? "this invoice"}? Any reserved calendar slots from this invoice will also be freed.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/invoices/${encodeURIComponent(invoiceId)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error?.message ?? "Could not delete invoice.");
      router.push("/admin/invoices");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete invoice.");
      setDeleting(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="admin-h1">{number ? `Invoice ${number}` : "New invoice"}</h1>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <a className="btn-ghost" href={src} target="_blank" rel="noreferrer">
            Open full screen ↗
          </a>
          {invoiceId && (
            <button
              type="button"
              className="btn-ghost"
              onClick={handleDelete}
              disabled={deleting}
              style={{ color: "#8a1c13" }}
            >
              {deleting ? "Deleting…" : "Delete invoice"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p style={{ color: "#8a1c13", fontWeight: 600, marginTop: 8 }}>{error}</p>
      )}
      <p className="muted" style={{ marginTop: 4 }}>
        {number
          ? "Changes are saved when you tap Save or Download PDF. The invoice keeps its number."
          : "The invoice number is assigned when you first tap Save or Download PDF."}
      </p>
      <iframe
        src={src}
        title="Cleanse invoice maker"
        style={{
          width: "100%",
          height: "calc(100vh - 200px)",
          minHeight: 640,
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "#fff",
          marginTop: 16,
        }}
      />
    </>
  );
}
