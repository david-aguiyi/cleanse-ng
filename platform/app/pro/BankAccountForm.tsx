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
          onChange={(e) => setBankName(e.target.value)}
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
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
          onChange={(e) => setAccountName(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={busy}>
        {busy ? "Saving…" : initialBank ? "Update Bank Details" : "Save Bank Details"}
      </button>
    </form>
  );
}

