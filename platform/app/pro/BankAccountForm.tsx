"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CleanerBankAccount } from "@/domain/payout/payout-service";

export default function BankAccountForm({
  initialBank,
  schemaReady,
}: {
  initialBank: CleanerBankAccount | null;
  schemaReady: boolean;
}) {
  const router = useRouter();
  const [bankName, setBankName] = useState(initialBank?.bank_name ?? "");
  const [accountNumber, setAccountNumber] = useState(initialBank?.account_number ?? "");
  const [accountName, setAccountName] = useState(initialBank?.account_name ?? "");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  if (!schemaReady) {
    return (
      <div className="notice info" style={{ margin: 0 }}>
        Payout bank setup will activate as soon as the office finishes updating the database.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const digits = accountNumber.replace(/\D/g, "");
    if (digits.length !== 10) {
      setMsg({ kind: "err", text: "Account number must be exactly 10 digits." });
      return;
    }
    if (!acknowledged) {
      setMsg({
        kind: "err",
        text: "Please tick the confirmation box to confirm your bank details are accurate before saving.",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/cleaner/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: bankName.trim(),
          account_number: digits,
          account_name: accountName.trim(),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMsg({ kind: "err", text: json.error?.message ?? "Could not save bank details." });
        return;
      }
      setAccountNumber(digits);
      setMsg({ kind: "ok", text: "Bank details saved. Your Cleanse operator can now settle payouts to this account." });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
      {msg && <div className={`notice ${msg.kind === "ok" ? "info" : "error"}`}>{msg.text}</div>}
      <div className="field">
        <label htmlFor="bankName">Bank Name</label>
        <input
          id="bankName"
          type="text"
          placeholder="e.g. GTBank, OPay, Zenith Bank, Kuda"
          value={bankName}
          onChange={(e) => {
            setBankName(e.target.value);
            setAcknowledged(false);
          }}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="accountNumber">Account Number (10 digits)</label>
        <input
          id="accountNumber"
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="0123456789"
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
            setAcknowledged(false);
          }}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="accountName">Account Name</label>
        <input
          id="accountName"
          type="text"
          placeholder="Full name as shown on your bank account"
          value={accountName}
          onChange={(e) => {
            setAccountName(e.target.value);
            setAcknowledged(false);
          }}
          required
        />
      </div>

      <div
        role="alert"
        style={{
          background: "#fff5f5",
          border: "1px solid #f5b5b5",
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 13,
          color: "#7f1d1d",
          lineHeight: 1.45,
        }}
      >
        <strong style={{ display: "block", marginBottom: 4 }}>
          Important: Double-check your bank details
        </strong>
        Cleanse.ng is not liable for transfers sent to incorrect bank details you provide, and wrongly
        sent payouts are <strong>not refundable</strong>. Please confirm your Bank Name, 10-digit Account
        Number, and Account Name before saving.
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 10,
            cursor: "pointer",
            fontWeight: 600,
            color: "#450a0a",
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
          />
          <span>
            I confirm these bank details are accurate and mine. I understand Cleanse.ng is not liable and
            no refund applies if details are wrong.
          </span>
        </label>
      </div>

      <button
        type="submit"
        className="btn-primary"
        style={{ width: "100%", opacity: acknowledged ? 1 : 0.65 }}
        disabled={busy || !acknowledged}
      >
        {busy ? "Saving…" : initialBank ? "Update Bank Details" : "Save Bank Details"}
      </button>
    </form>
  );
}

