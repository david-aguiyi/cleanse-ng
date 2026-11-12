"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { humanJobStatus } from "../../format";
import StatusBadge from "../../_components/StatusBadge";

/** Embeds the invoice maker and keeps URL, synced Job link, and full-screen view aligned. */
export default function MakerFrame({
  initialId,
  initialNumber,
  initialJobId,
  initialJobStatus,
}: {
  initialId: string | null;
  initialNumber: string | null;
  initialJobId: string | null;
  initialJobStatus: string | null;
}) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState(initialId);
  const [number, setNumber] = useState(initialNumber);
  const [jobId, setJobId] = useState(initialJobId);
  const [jobStatus, setJobStatus] = useState(initialJobStatus);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJobId(initialJobId);
    setJobStatus(initialJobStatus);
  }, [initialJobId, initialJobStatus]);

  const embeddedSrc = invoiceId
    ? `/admin/invoices/maker?id=${invoiceId}&embedded=1`
    : "/admin/invoices/maker?embedded=1";
  const fullScreenSrc = invoiceId ? `/admin/invoices/maker?id=${invoiceId}` : "/admin/invoices/maker";

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const m = e.data as { type?: string; id?: string; num?: string };
      if (m?.type !== "cleanse-invoice-saved" || !m.id) return;
      setInvoiceId(m.id);
      setNumber(m.num ?? null);
      window.history.replaceState(null, "", `/admin/invoices/${m.id}`);
      router.refresh();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  async function handleDelete() {
    if (!invoiceId || deleting) return;
    if (
      !window.confirm(
        `Delete ${number ?? "this invoice"}? Any synced Job and reserved calendar slots from this invoice will also be deleted.`
      )
    ) {
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="admin-h1" style={{ margin: 0 }}>
              {number ? `Invoice ${number}` : "New Invoice"}
            </h1>
            {jobStatus && <StatusBadge status={humanJobStatus(jobStatus)} />}
          </div>
          <p className="ops-page-sub" style={{ marginTop: 4 }}>
            {number
              ? "Saving or downloading PDF automatically syncs your operational Job, assigned Cleanse Pros, and visit dates."
              : "Enter client details, schedule, and pricing. An invoice number and Job are created automatically when you save."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {jobId && (
            <Link className="ops-quick-btn is-primary" href={`/admin/jobs/${jobId}`}>
              View Synced Job →
            </Link>
          )}
          <a className="ops-quick-btn" href={fullScreenSrc} target="_blank" rel="noreferrer">
            Open full screen ↗
          </a>
          {invoiceId && (
            <button
              type="button"
              className="ops-quick-btn"
              onClick={handleDelete}
              disabled={deleting}
              style={{ color: "#991b1b", borderColor: "#fecaca" }}
            >
              {deleting ? "Deleting…" : "Delete invoice"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p style={{ color: "#991b1b", fontWeight: 700, marginTop: 8 }}>{error}</p>
      )}

      <iframe
        src={embeddedSrc}
        title="Cleanse invoice maker"
        style={{
          width: "100%",
          height: "calc(100vh - 180px)",
          minHeight: 680,
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "#fff",
          marginTop: 12,
        }}
      />
    </>
  );
}
