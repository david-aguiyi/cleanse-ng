"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MonthBucket,
  CleanerBankAccount,
  OperatorUnpaidEarningRow,
} from "@/domain/payout/payout-service";
import { formatMonthLabel } from "@/domain/payout/payout-summary";
import { shortDate } from "../format";

interface Props {
  cleanerId: string;
  cleanerName: string;
  bankAccount: CleanerBankAccount | null;
  unpaidTotalNaira: number;
  unpaidCount: number;
  unpaidByMonth: MonthBucket[];
  unpaidEarnings: OperatorUnpaidEarningRow[];
  todayIso: string;
}

async function copyText(val: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(val);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = val;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function monthEndDate(monthKey: string): string {
  const [yStr, mStr] = monthKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m) return monthKey;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${yStr}-${mStr}-${String(lastDay).padStart(2, "0")}`;
}

export default function PayoutActions({
  cleanerId,
  cleanerName,
  bankAccount,
  unpaidTotalNaira,
  unpaidCount,
  unpaidByMonth,
  unpaidEarnings,
  todayIso,
}: Props) {
  const router = useRouter();
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const visibleEarnings =
    selectedScope === "all"
      ? unpaidEarnings
      : unpaidEarnings.filter((e) => e.earned_on.slice(0, 7) === selectedScope);
  const [idemKey, setIdemKey] = useState<string>(() => crypto.randomUUID());

  const activeBucket =
    selectedScope === "all"
      ? { periodKey: "all", cutoffDate: todayIso, totalNaira: unpaidTotalNaira, visitCount: unpaidCount }
      : (() => {
          const b = unpaidByMonth.find((m) => m.month_key === selectedScope);
          return {
            periodKey: selectedScope,
            cutoffDate: monthEndDate(selectedScope) < todayIso ? monthEndDate(selectedScope) : todayIso,
            totalNaira: b?.total_naira ?? 0,
            visitCount: b?.visit_count ?? 0,
          };
        })();

  async function copyAcct() {
    if (!bankAccount) return;
    const text = `${bankAccount.bank_name} — ${bankAccount.account_number} (${bankAccount.account_name})`;
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  async function settle() {
    if (!bankAccount) {
      setMsg({ kind: "err", text: "Cleaner must add bank details in /pro/profile before settlement." });
      return;
    }
    if (activeBucket.totalNaira <= 0 || activeBucket.visitCount <= 0) {
      setMsg({ kind: "err", text: "Nothing owed for this period." });
      return;
    }
    const label = activeBucket.periodKey === "all" ? "all unpaid cleans through today" : `month ${activeBucket.periodKey}`;
    if (
      !window.confirm(
        `Confirm bank transfer of ₦${activeBucket.totalNaira.toLocaleString("en-NG")} (${activeBucket.visitCount} clean${
          activeBucket.visitCount === 1 ? "" : "s"
        }, ${label}) to ${cleanerName} (${bankAccount.bank_name} · ${bankAccount.account_number})?\n\nThis clears them off for this period so they cannot be paid twice.`
      )
    ) {
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/cleaners/${cleanerId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_key: activeBucket.periodKey,
          cutoff_date: activeBucket.cutoffDate,
          idempotency_key: idemKey,
          reference_note: note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMsg({ kind: "err", text: json.error?.message ?? "Could not confirm payout." });
        return;
      }
      setIdemKey(crypto.randomUUID());
      setNote("");
      setMsg({
        kind: "ok",
        text: `Paid ₦${Number(json.data.total_amount_naira).toLocaleString("en-NG")} (${json.data.earning_count} cleans) settled & locked.`,
      });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "Network error while confirming payout." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {bankAccount ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 10px",
            background: "var(--off-white, #f7f7fb)",
            borderRadius: 8,
            border: "1px solid var(--border, #e5e7eb)",
            fontSize: 13,
          }}
        >
          <div>
            <strong>{bankAccount.bank_name}</strong> · <code>{bankAccount.account_number}</code>
            <div className="muted" style={{ fontSize: 12 }}>
              {bankAccount.account_name}
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={copyAcct}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            {copied ? "Copied ✓" : "Copy bank"}
          </button>
        </div>
      ) : (
        <div className="notice error" style={{ margin: 0, fontSize: 12.5 }}>
          No bank account saved yet. Ask {cleanerName} to add their bank details in the Pro Portal.
        </div>
      )}

      {unpaidCount > 0 && (
        <>
          <div className="muted" style={{ fontSize: 12 }}>
            <strong>Step 1:</strong> Transfer{" "}
            <strong>₦{activeBucket.totalNaira.toLocaleString("en-NG")}</strong> in your bank app.{" "}
            <strong>Step 2:</strong> Click <strong>Confirm Paid</strong> below to record the receipt.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}
            >
              <option value="all">
                All unpaid up to {shortDate(todayIso)} (₦{unpaidTotalNaira.toLocaleString("en-NG")} · {unpaidCount})
              </option>
              {unpaidByMonth.map((m) => (
                <option key={m.month_key} value={m.month_key}>
                  {formatMonthLabel(m.month_key)} (₦{m.total_naira.toLocaleString("en-NG")} · {m.visit_count})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Transfer ref / note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                flex: "1 1 160px",
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 13,
              }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={settle}
              disabled={busy || !bankAccount || activeBucket.totalNaira <= 0}
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              {busy
                ? "Settling…"
                : `Confirm Paid (₦${activeBucket.totalNaira.toLocaleString("en-NG")})`}
            </button>
          </div>

          {visibleEarnings.length > 0 && (
            <div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowBreakdown((v) => !v)}
                style={{ fontSize: 12.5, padding: "2px 0" }}
              >
                {showBreakdown
                  ? `Hide served jobs breakdown (${visibleEarnings.length}) ▴`
                  : `View ${visibleEarnings.length} served clean${visibleEarnings.length === 1 ? "" : "s"} breakdown ▾`}
              </button>

              {showBreakdown && (
                <div
                  style={{
                    marginTop: 8,
                    border: "1px solid var(--border, #e5e7eb)",
                    borderRadius: 8,
                    overflowX: "auto",
                    background: "#fff",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "var(--off-white, #f7f7fb)", textAlign: "left" }}>
                        <th style={{ padding: "7px 10px" }}>Served Date</th>
                        <th style={{ padding: "7px 10px" }}>Job</th>
                        <th style={{ padding: "7px 10px", textAlign: "right" }}>Clean Fee</th>
                        <th style={{ padding: "7px 10px", textAlign: "right" }}>Supplies</th>
                        <th style={{ padding: "7px 10px", textAlign: "right" }}>Pro Cut (70%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEarnings.map((e) => (
                        <tr key={e.id} style={{ borderTop: "1px solid var(--border, #e5e7eb)" }}>
                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>{shortDate(e.earned_on)}</td>
                          <td style={{ padding: "7px 10px" }}>
                            <span style={{ fontWeight: 600, color: "var(--deep-purple)" }}>{e.job_label}</span>
                            {e.share_bps < 10000 && (
                              <span className="muted" style={{ marginLeft: 6, fontSize: 11.5 }}>
                                ({Math.round(e.share_bps / 100)}% team split)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                            ₦{e.gross_clean_naira.toLocaleString("en-NG")}
                          </td>
                          <td style={{ padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                            {e.supplies_deducted_naira > 0
                              ? `-₦${e.supplies_deducted_naira.toLocaleString("en-NG")}`
                              : "₦0"}
                          </td>
                          <td
                            style={{
                              padding: "7px 10px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: "var(--deep-purple)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ₦{e.amount_naira.toLocaleString("en-NG")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "1px solid var(--border, #e5e7eb)", background: "var(--off-white, #f7f7fb)" }}>
                        <td colSpan={4} style={{ padding: "7px 10px", fontWeight: 700, textAlign: "right" }}>
                          Total ({visibleEarnings.length} clean{visibleEarnings.length === 1 ? "" : "s"}):
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "right",
                            fontWeight: 800,
                            color: "var(--deep-purple)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₦{activeBucket.totalNaira.toLocaleString("en-NG")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {msg && (
        <div
          className={`notice ${msg.kind === "err" ? "error" : "info"}`}
          style={{ margin: 0, fontSize: 12.5 }}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

