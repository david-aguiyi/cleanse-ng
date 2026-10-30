"use client";

import { useEffect, useState } from "react";

/** Embeds the invoice maker and follows it when a new invoice gets its number. */
export default function MakerFrame({
  initialId,
  initialNumber,
}: {
  initialId: string | null;
  initialNumber: string | null;
}) {
  const [number, setNumber] = useState(initialNumber);
  const src = initialId ? `/admin/invoices/maker?id=${initialId}` : "/admin/invoices/maker";

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const m = e.data as { type?: string; id?: string; num?: string };
      if (m?.type !== "cleanse-invoice-saved" || !m.id) return;
      setNumber(m.num ?? null);
      window.history.replaceState(null, "", `/admin/invoices/${m.id}`);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="admin-h1">{number ? `Invoice ${number}` : "New invoice"}</h1>
        <a className="btn-ghost" href={src} target="_blank" rel="noreferrer">
          Open full screen ↗
        </a>
      </div>
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
