import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, it, expect } from "vitest";
import {
  CLEANER_SHARE_BPS,
  suppliesDeductionPerVisit,
  splitCleanerPool,
  computeInvoiceJobEconomics,
  isJobActiveForCalendar,
  targetStatusForUnservedVisit,
  selectEarningsForSettlement,
  isAddressUnlockedForSlot,
  isAddressUnlockedForTimestamp,
} from "../../src/domain/job/pricing";
import { payoutConfig } from "../../src/config";
import {
  invoiceSaveSchema,
  invoiceJobStatusSchema,
  updateInvoiceJobCleanersSchema,
  markVisitServedSchema,
  cleanerBankAccountSchema,
  settlePayoutSchema,
} from "../../src/validation/schemas";
import {
  summarizeMonthlyPayouts,
  resolveSettlementMonthKey,
  formatMonthLabel,
} from "../../src/domain/payout/payout-summary";

describe("Jobs, Supplies, 70% Pool & Settlement Rules", () => {
  it("defaults CLEANER_PAYOUT_BPS to 7000 (70%)", () => {
    expect(CLEANER_SHARE_BPS).toBe(7000);
    expect(payoutConfig.cleanerPayoutBps).toBe(7000);
  });

  it("computes internal supplies deduction by bedroom tier on every job regardless of materials dropdown", () => {
    expect(suppliesDeductionPerVisit(1, "cleanse")).toBe(800);
    expect(suppliesDeductionPerVisit(2, "cleanse")).toBe(800);
    expect(suppliesDeductionPerVisit(3, "cleanse")).toBe(1500);
    expect(suppliesDeductionPerVisit(4, "cleanse")).toBe(1500);
    expect(suppliesDeductionPerVisit(5, "cleanse")).toBe(1500);

    // Deducts uniformly even when client provides materials (Operator Option B)
    expect(suppliesDeductionPerVisit(1, "client")).toBe(800);
    expect(suppliesDeductionPerVisit(2, "client")).toBe(800);
    expect(suppliesDeductionPerVisit(4, "client")).toBe(1500);
    expect(suppliesDeductionPerVisit(5, "CLIENT")).toBe(1500);
  });

  it("hides exact house address until 1 hour before scheduled clean window (Africa/Lagos)", () => {
    // 8am - 11am job on 2026-11-12 unlocks at 07:00+01:00
    expect(isAddressUnlockedForSlot("2026-11-12", "8am - 11am", new Date("2026-11-11T18:00:00+01:00")).unlocked).toBe(false);
    expect(isAddressUnlockedForSlot("2026-11-12", "8am - 11am", new Date("2026-11-12T06:59:59+01:00")).unlocked).toBe(false);
    expect(isAddressUnlockedForSlot("2026-11-12", "8am - 11am", new Date("2026-11-12T07:00:00+01:00")).unlocked).toBe(true);
    expect(isAddressUnlockedForSlot("2026-11-12", "8am - 11am", new Date("2026-11-13T00:00:01+01:00")).unlocked).toBe(false);

    // 11am - 2pm unlocks at 10:00+01:00; 2pm - 5pm unlocks at 13:00+01:00
    expect(isAddressUnlockedForSlot("2026-11-12", "11am - 2pm", new Date("2026-11-12T09:59:00+01:00")).unlocked).toBe(false);
    expect(isAddressUnlockedForSlot("2026-11-12", "11am - 2pm", new Date("2026-11-12T10:00:00+01:00")).unlocked).toBe(true);
    expect(isAddressUnlockedForSlot("2026-11-12", "2pm - 5pm", new Date("2026-11-12T12:59:00+01:00")).unlocked).toBe(false);
    expect(isAddressUnlockedForSlot("2026-11-12", "2pm - 5pm", new Date("2026-11-12T13:00:00+01:00")).unlocked).toBe(true);

    // Timestamp helper for online bookings
    const startIso = "2026-11-12T08:00:00+01:00";
    expect(isAddressUnlockedForTimestamp(startIso, new Date("2026-11-12T06:59:00+01:00")).unlocked).toBe(false);
    expect(isAddressUnlockedForTimestamp(startIso, new Date("2026-11-12T07:00:00+01:00")).unlocked).toBe(true);
  });

  it("splits the 70% pool strictly without rounding loss for 1 or 2 cleaners", () => {
    expect(splitCleanerPool(14000, 0)).toEqual([]);
    expect(splitCleanerPool(14000, 1)).toEqual([{ shareBps: 10000, amountNaira: 14000 }]);
    expect(splitCleanerPool(14000, 2)).toEqual([
      { shareBps: 5000, amountNaira: 7000 },
      { shareBps: 5000, amountNaira: 7000 },
    ]);

    // Odd-naira pool (e.g. ₦14,001) still sums strictly to poolNaira
    const oddSplit = splitCleanerPool(14001, 2);
    expect(oddSplit).toHaveLength(2);
    expect(oddSplit.reduce((sum, s) => sum + s.amountNaira, 0)).toBe(14001);
  });

  it("computes Price/Clean, Supplies Deduction, 70% Cleaner Pool, and Plan Cut accurately", () => {
    // Example: 4BR monthly plan, 4 sessions, ₦86,000 total, Cleanse provides supplies (₦1,500/visit)
    const eco2Pros = computeInvoiceJobEconomics({
      totalNaira: 86000,
      sessionsCount: 4,
      bedrooms: 4,
      materialsBy: "cleanse",
      cleanerCount: 2,
    });
    expect(eco2Pros.pricePerCleanNaira).toBe(21500);
    expect(eco2Pros.suppliesPerVisitNaira).toBe(1500);
    expect(eco2Pros.netBasePerCleanNaira).toBe(20000);
    expect(eco2Pros.cleanerPoolPerCleanNaira).toBe(14000); // 70% of ₦20,000
    expect(eco2Pros.planCleanerCutNaira).toBe(56000); // 4 × ₦14,000
    expect(eco2Pros.cleanerSplits).toEqual([
      { shareBps: 5000, amountNaira: 7000 },
      { shareBps: 5000, amountNaira: 7000 },
    ]);

    // Example: 2BR one-off, ₦20,800 total, Cleanse provides supplies (₦800/visit), 1 cleaner
    const eco1Pro = computeInvoiceJobEconomics({
      totalNaira: 20800,
      sessionsCount: 1,
      bedrooms: 2,
      materialsBy: "cleanse",
      cleanerCount: 1,
    });
    expect(eco1Pro.pricePerCleanNaira).toBe(20800);
    expect(eco1Pro.suppliesPerVisitNaira).toBe(800);
    expect(eco1Pro.netBasePerCleanNaira).toBe(20000);
    expect(eco1Pro.cleanerPoolPerCleanNaira).toBe(14000);
    expect(eco1Pro.planCleanerCutNaira).toBe(14000);
    expect(eco1Pro.cleanerSplits).toEqual([{ shareBps: 10000, amountNaira: 14000 }]);

    // Example: 4BR, ₦80,000 total with client materials still deducts ₦1,500 supplies per visit
    const ecoClientMat = computeInvoiceJobEconomics({
      totalNaira: 80000,
      sessionsCount: 4,
      bedrooms: 4,
      materialsBy: "client",
      cleanerCount: 1,
    });
    expect(ecoClientMat.suppliesPerVisitNaira).toBe(1500);
    expect(ecoClientMat.netBasePerCleanNaira).toBe(18500);
    expect(ecoClientMat.cleanerPoolPerCleanNaira).toBe(12950); // 70% of ₦18,500
  });

  it("controls calendar slot reservation and visit transitions without erasing SERVED visits", () => {
    expect(isJobActiveForCalendar("ACTIVE", true)).toBe(true);
    expect(isJobActiveForCalendar("ACTIVE", false)).toBe(false);
    expect(isJobActiveForCalendar("PENDING", true)).toBe(false);
    expect(isJobActiveForCalendar("PAUSED", true)).toBe(false);
    expect(isJobActiveForCalendar("ENDED", true)).toBe(false);
    expect(isJobActiveForCalendar("TERMINATED", true)).toBe(false);

    const today = "2026-11-11";
    // SERVED is strictly preserved on ALL job lifecycle transitions
    for (const nextStatus of ["PENDING", "ACTIVE", "PAUSED", "ENDED", "TERMINATED"] as const) {
      expect(targetStatusForUnservedVisit(nextStatus, "SERVED", "2026-11-05", today)).toBe("SERVED");
      expect(targetStatusForUnservedVisit(nextStatus, "SERVED", "2026-11-15", today)).toBe("SERVED");
    }

    // PAUSED freezes upcoming SCHEDULED visits without discarding historical SCHEDULED ones
    expect(targetStatusForUnservedVisit("PAUSED", "SCHEDULED", "2026-11-15", today)).toBe("PAUSED");
    expect(targetStatusForUnservedVisit("PAUSED", "SCHEDULED", "2026-11-08", today)).toBe("SCHEDULED");

    // ENDED / TERMINATED cancels remaining upcoming/paused visits
    expect(targetStatusForUnservedVisit("ENDED", "SCHEDULED", "2026-11-15", today)).toBe("CANCELLED");
    expect(targetStatusForUnservedVisit("TERMINATED", "PAUSED", "2026-11-18", today)).toBe("CANCELLED");

    // Re-activating restores paused/future cancelled visits back to SCHEDULED
    expect(targetStatusForUnservedVisit("ACTIVE", "PAUSED", "2026-11-15", today)).toBe("SCHEDULED");
    expect(targetStatusForUnservedVisit("ACTIVE", "CANCELLED", "2026-11-15", today)).toBe("SCHEDULED");
  });

  it("filters settlement earnings by cutoff date and prevents double payment", () => {
    const ledger = [
      { id: "e1", earned_on: "2026-10-20", amount_naira: 7000, payout_id: "p-oct" }, // already paid
      { id: "e2", earned_on: "2026-11-02", amount_naira: 14000, payout_id: null },
      { id: "e3", earned_on: "2026-11-10", amount_naira: 7000, payout_id: null },
      { id: "e4", earned_on: "2026-12-01", amount_naira: 14000, payout_id: null }, // after Nov cutoff
    ];

    const novSettlement = selectEarningsForSettlement(ledger, "2026-11-30");
    expect(novSettlement).toEqual({
      ids: ["e2", "e3"],
      totalNaira: 21000,
      count: 2,
    });

    // After marking e2 & e3 settled, re-running Nov settlement yields 0 (no double payment)
    const afterPaid = ledger.map((r) =>
      novSettlement.ids.includes(r.id) ? { ...r, payout_id: "p-nov" } : r
    );
    expect(selectEarningsForSettlement(afterPaid, "2026-11-30")).toEqual({
      ids: [],
      totalNaira: 0,
      count: 0,
    });
  });

  it("validates cleaner bank details, job assignments (max 2), and payout schemas", () => {
    expect(
      cleanerBankAccountSchema.safeParse({
        bank_name: "GTBank",
        account_number: "0123456789",
        account_name: "Adaeze Okafor",
      }).success
    ).toBe(true);

    expect(
      cleanerBankAccountSchema.safeParse({
        bank_name: "GTBank",
        account_number: "12345",
        account_name: "Adaeze Okafor",
      }).success
    ).toBe(false);

    const u1 = "11111111-1111-4111-8111-111111111111";
    const u2 = "22222222-2222-4222-8222-222222222222";
    const u3 = "33333333-3333-4333-8333-333333333333";

    expect(updateInvoiceJobCleanersSchema.safeParse({ cleaner_ids: [u1, u2] }).success).toBe(true);
    expect(updateInvoiceJobCleanersSchema.safeParse({ cleaner_ids: [u1, u2, u3] }).success).toBe(false);

    expect(invoiceJobStatusSchema.safeParse({ status: "TERMINATED" }).success).toBe(true);
    expect(markVisitServedSchema.safeParse({ action: "SERVED", cleaner_ids: [u1] }).success).toBe(true);
    expect(
      settlePayoutSchema.safeParse({
        period_key: "2026-11",
        cutoff_date: "2026-11-30",
        idempotency_key: u1,
      }).success
    ).toBe(true);

    const inv = invoiceSaveSchema.safeParse({
      num: "CLN-099",
      data: {
        client: "Akinloye",
        phone: "+234 903 174 6315",
        cleanerIds: [u1, u2],
        jobStatus: "ACTIVE",
        items: [{ d: "Monthly Plan", a: 86000 }],
      },
    });
    expect(inv.success).toBe(true);
  });

  it("keeps client phone, serving days/times, and cleaner pay out of the PDF derive() output", () => {
    const htmlPath = path.resolve(__dirname, "../../private/invoice-maker.html");
    const html = fs.readFileSync(htmlPath, "utf8");

    const constStart = html.indexOf("const WORDS =");
    const constEnd = html.indexOf("function normSlotVal");
    const derivedStart = html.indexOf("/* ---------- derived content ---------- */");
    const derivedEnd = html.indexOf("/* ---------- layout (mm) ---------- */");
    expect(constStart).toBeGreaterThan(-1);
    expect(constEnd).toBeGreaterThan(constStart);
    expect(derivedStart).toBeGreaterThan(constEnd);
    expect(derivedEnd).toBeGreaterThan(derivedStart);

    const snippet = [
      html.slice(constStart, constEnd),
      "function normSlotVal(s) { return s || ''; }",
      "function weekdayOf() { return null; }",
      "function generateVisitsFromRule() { return []; }",
      html.slice(derivedStart, derivedEnd),
    ].join("\n");
    const context: Record<string, any> = {
      SRV: { contactPhone: "+234 913 066 3739" },
    };
    vm.runInNewContext(
      `${snippet}; globalThis.__derive = derive; globalThis.__autoTerms = autoTerms;`,
      context
    );

    const derived = context.__derive({
      num: "CLN-003",
      date: "2026-11-06",
      client: "Akinloye",
      phone: "09031746315",
      addr: "Carlton Gate Estate",
      area: "Akobo, Ibadan",
      beds: "4",
      kind: "Residential Home",
      billing: "monthly",
      svc: "Residential Home Cleaning",
      svcCustom: "",
      freq: "Once weekly",
      sessions: "4",
      startDate: "2026-11-06",
      endDate: "2026-12-06",
      visitDays: [6],
      visitSlot: "8am - 11am",
      visitDates: ["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"],
      mat: "cleanse",
      equip: "cleanse",
      dep: "50",
      items: [{ d: "Monthly Cleaning Plan", a: "86000" }],
      accName: "Cleanse",
      bank: "GTBank",
      accNo: "0123456789",
      terms: null,
      cleanerIds: ["11111111-1111-4111-8111-111111111111"],
    });

    const serialized = JSON.stringify(derived);
    expect(serialized).not.toContain("09031746315");
    expect(serialized).not.toContain("Client Phone");
    expect(serialized).not.toContain("8am - 11am");
    expect(serialized).not.toContain("Saturday");
    expect(serialized).not.toContain("scheduleRows");
    expect(serialized).not.toContain("1500");
    expect(serialized).not.toContain("14000");
    expect(derived.client.some((row: { k: string }) => /phone/i.test(row.k))).toBe(false);
  });

  it("queries valid cleaner_account_status enum values (never invalid PAUSED)", () => {
    const jobSvc = fs.readFileSync(
      path.resolve(__dirname, "../../src/domain/job/invoice-job-service.ts"),
      "utf8"
    );
    const payoutSvc = fs.readFileSync(
      path.resolve(__dirname, "../../src/domain/payout/payout-service.ts"),
      "utf8"
    );
    expect(jobSvc).toContain(`["ACTIVE", "ONBOARDING", "INACTIVE"]`);
    expect(jobSvc).not.toContain(`"ACTIVE", "ONBOARDING", "PAUSED"`);
    expect(payoutSvc).toContain(`["ACTIVE", "ONBOARDING", "INACTIVE", "SUSPENDED"]`);
    expect(payoutSvc).not.toContain(`"ACTIVE", "ONBOARDING", "PAUSED"`);
  });

  it("summarizes cumulative total paid, per-month totals, and distinct workers paid per month", () => {
    const summary = summarizeMonthlyPayouts(
      [
        {
          cleaner_id: "c1",
          cleaner_name: "Aguiyi David",
          cleaner_code: "CLN-01",
          period_key: "2026-10",
          cutoff_date: "2026-10-31",
          settled_at: "2026-11-01T10:00:00Z",
          total_amount_naira: 20000,
          earning_count: 4,
        },
        {
          cleaner_id: "c1",
          cleaner_name: "Aguiyi David",
          cleaner_code: "CLN-01",
          period_key: "all",
          cutoff_date: "2026-11-15",
          settled_at: "2026-11-15T12:00:00Z",
          total_amount_naira: 12000,
          earning_count: 2,
        },
        {
          cleaner_id: "c1",
          cleaner_name: "Aguiyi David",
          cleaner_code: "CLN-01",
          period_key: "all",
          cutoff_date: "2026-11-30",
          settled_at: "2026-11-30T14:00:00Z",
          total_amount_naira: 8000,
          earning_count: 2,
        },
        {
          cleaner_id: "c2",
          cleaner_name: "Tunde Ade",
          cleaner_code: "CLN-02",
          period_key: "2026-11",
          cutoff_date: "2026-11-30",
          settled_at: "2026-11-30T15:00:00Z",
          total_amount_naira: 15000,
          earning_count: 3,
        },
      ],
      "2026-11"
    );

    expect(formatMonthLabel("2026-11")).toBe("Nov 2026");
    expect(
      resolveSettlementMonthKey({
        period_key: "2026-10",
        settled_at: "2026-11-01T10:00:00Z",
        cutoff_date: "2026-10-31",
      })
    ).toBe("2026-10");
    expect(
      resolveSettlementMonthKey({
        period_key: "all",
        settled_at: "2026-11-15T12:00:00Z",
        cutoff_date: "2026-11-15",
      })
    ).toBe("2026-11");

    expect(summary.cumulative_paid_naira).toBe(55000);
    expect(summary.cumulative_workers_paid_count).toBe(2);
    expect(summary.cumulative_cleans_count).toBe(11);
    expect(summary.cumulative_settlement_count).toBe(4);
    expect(summary.this_month_paid_naira).toBe(35000);
    expect(summary.this_month_workers_paid_count).toBe(2);

    expect(summary.months).toHaveLength(2);
    expect(summary.months[0]).toMatchObject({
      month_key: "2026-11",
      month_label: "Nov 2026",
      total_paid_naira: 35000,
      cumulative_paid_through_month_naira: 55000,
      workers_paid_count: 2,
      settlement_count: 3,
      cleans_count: 7,
    });
    expect(summary.months[0]?.workers[0]).toMatchObject({
      cleaner_id: "c1",
      amount_naira: 20000,
      cleans_count: 4,
    });
    expect(summary.months[1]).toMatchObject({
      month_key: "2026-10",
      month_label: "Oct 2026",
      total_paid_naira: 20000,
      cumulative_paid_through_month_naira: 20000,
      workers_paid_count: 1,
    });
  });
});
