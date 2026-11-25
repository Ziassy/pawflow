import { describe, expect, it } from "vitest";
import {
  buildInstallments,
  debtTotalsByMonth,
  latestSnapshot,
  overallPayoff,
  personalDebtBalance,
  projectDebt,
  summarizeReceivable,
} from "./debt";
import { addMonths } from "./format";

describe("projectDebt", () => {
  const snaps = [
    { month: "2026-09", balance: 12_000_000 },
    { month: "2026-11", balance: 10_000_000 },
  ];
  const plans = [
    { month: "2026-10", amount: 2_000_000, paid: true }, // sebelum saldo terakhir -> diabaikan
    { month: "2026-11", amount: 3_000_000, paid: false },
    { month: "2026-12", amount: 3_000_000, paid: false },
    { month: "2027-01", amount: 3_000_000, paid: false },
    { month: "2027-02", amount: 3_000_000, paid: false },
  ];
  it("lunas di bulan saat kumulatif rencana ≥ saldo terakhir", () => {
    const p = projectDebt(snaps, plans);
    expect(p.baseMonth).toBe("2026-11");
    expect(p.plannedTotal).toBe(12_000_000);
    expect(p.remainingAfterPlan).toBe(0);
    expect(p.payoffMonth).toBe("2027-02");
  });
  it("rencana kurang -> sisa & belum ada bulan lunas", () => {
    const p = projectDebt(snaps, plans.slice(0, 3));
    expect(p.remainingAfterPlan).toBe(4_000_000);
    expect(p.payoffMonth).toBeNull();
  });
  it("tanpa saldo -> tidak bisa diproyeksikan", () => {
    expect(projectDebt([], plans).balance).toBeNull();
  });
  it("saldo 0 = lunas", () => {
    expect(projectDebt([{ month: "2026-01", balance: 0 }], []).paidOff).toBe(true);
  });
  it("acuan bulan memakai saldo ≤ bulan acuan", () => {
    expect(latestSnapshot(snaps, "2026-10")?.balance).toBe(12_000_000);
  });
});

describe("overallPayoff & total per bulan", () => {
  it("bulan lunas terakhir", () => {
    const a = projectDebt([{ month: "2026-11", balance: 1 }], [{ month: "2027-03", amount: 1, paid: false }]);
    const b = projectDebt([{ month: "2026-11", balance: 1 }], [{ month: "2026-12", amount: 1, paid: false }]);
    expect(overallPayoff([a, b])).toBe("2027-03");
    const c = projectDebt([{ month: "2026-11", balance: 5 }], []);
    expect(overallPayoff([a, c])).toBeNull();
  });
  it("total memakai saldo terakhir per kartu", () => {
    expect(
      debtTotalsByMonth([
        [{ month: "2026-01", balance: 100 }, { month: "2026-03", balance: 50 }],
        [{ month: "2026-02", balance: 10 }],
      ]),
    ).toEqual([
      { month: "2026-01", total: 100 },
      { month: "2026-02", total: 110 },
      { month: "2026-03", total: 60 },
    ]);
  });
});

describe("piutang", () => {
  it("total tagihan, keuntungan, sisa", () => {
    const inst = buildInstallments("2026-11", 6, 1_000_000, addMonths).map((i, k) => ({ ...i, paid: k < 2 }));
    expect(inst.at(-1)!.month).toBe("2027-04");
    const s = summarizeReceivable(5_000_000, inst);
    expect(s.totalBill).toBe(6_000_000);
    expect(s.profit).toBe(1_000_000);
    expect(s.paid).toBe(2_000_000);
    expect(s.remaining).toBe(4_000_000);
    expect(s.paidCount).toBe(2);
  });
  it("hutang ke orang", () => {
    expect(personalDebtBalance([{ amount: 500_000 }, { amount: -200_000 }])).toBe(300_000);
  });
});

import { ledger } from "./debt";

describe("ledger (piutang bebas: contoh Abdi)", () => {
  it("pinjam 1jt, bayar 100rb, bayar 200rb, pinjam lagi 500rb", () => {
    const l = ledger([
      { id: 3, date: "2026-11-02", description: "Bayar", amount: -200_000 },
      { id: 1, date: "2026-11-01", description: "Pinjam", amount: 1_000_000 },
      { id: 2, date: "2026-11-01", description: "Bayar", amount: -100_000 },
      { id: 4, date: "2026-11-10", description: "Pinjam lagi", amount: 500_000 },
    ]);
    expect(l.rows.map((r) => r.balance)).toEqual([1_000_000, 900_000, 700_000, 1_200_000]);
    expect(l.totalDebit).toBe(1_500_000);
    expect(l.totalCredit).toBe(300_000);
    expect(l.balance).toBe(1_200_000);
    expect(l.rows[1]).toMatchObject({ debit: 0, credit: 100_000 });
  });
  it("kosong", () => {
    expect(ledger([]).balance).toBe(0);
  });
});

import { sortByAmountDesc } from "./debt";

describe("sortByAmountDesc", () => {
  it("terbesar dulu, 0/kosong/lunas paling bawah", () => {
    const r = sortByAmountDesc(
      [
        { n: "A", v: 0 },
        { n: "B", v: 500 },
        { n: "C", v: null },
        { n: "D", v: 2000 },
        { n: "E", v: -50 },
        { n: "F", v: 500 },
      ],
      (x) => x.v,
    );
    expect(r.map((x) => x.n)).toEqual(["D", "B", "F", "A", "C", "E"]);
  });
});
