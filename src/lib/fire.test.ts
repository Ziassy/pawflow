import { describe, expect, it } from "vitest";
import { ageAt, ageAtMonth, allocateFromSalary, fire, goalPlan, goalTimeline, monthAtAge, monthsUntilAge } from "./fire";

describe("usia", () => {
  it("usia penuh", () => {
    const b = new Date(1998, 5, 15);
    expect(ageAt(b, new Date(2026, 5, 14))).toBe(27);
    expect(ageAt(b, new Date(2026, 5, 15))).toBe(28);
  });
  it("sisa bulan ke usia target", () => {
    expect(monthsUntilAge(new Date(1998, 5, 15), 40, new Date(2026, 10, 1))).toBe(12 * 12 - 5);
  });
});

describe("fire", () => {
  it("bunga kotor & bersih dari dana target", () => {
    const r = fire({ target: 1_000_000_000, collected: 0, monthsLeft: 120, rateBps: 750, taxBps: 2000 });
    expect(r.monthlyInterestGross).toBe(6_250_000);
    expect(r.monthlyInterestNet).toBe(5_000_000);
  });
  it("tabungan per bulan tanpa & dengan bunga", () => {
    const r = fire({ target: 15_000_000, collected: 3_000_000, monthsLeft: 12, rateBps: 0, taxBps: 0 });
    expect(r.remaining).toBe(12_000_000);
    expect(r.requiredMonthly).toBe(1_000_000);
    expect(r.requiredMonthlyWithInterest).toBe(1_000_000);
    const w = fire({ target: 15_000_000, collected: 3_000_000, monthsLeft: 12, rateBps: 750, taxBps: 2000 });
    expect(w.requiredMonthlyWithInterest!).toBeLessThan(1_000_000);
    expect(w.requiredMonthlyWithInterest!).toBeGreaterThan(950_000);
    expect(w.progress).toBeCloseTo(0.2);
  });
  it("tanpa tenggat -> tidak dihitung; target 0 -> progress null", () => {
    expect(fire({ target: 1, collected: 0, monthsLeft: null, rateBps: 750, taxBps: 2000 }).requiredMonthly).toBeNull();
    expect(fire({ target: 0, collected: 0, monthsLeft: 5, rateBps: 750, taxBps: 2000 }).progress).toBeNull();
  });
});

describe("allocateFromSalary", () => {
  it("berurutan sesuai prioritas", () => {
    const m = allocateFromSalary(
      [
        { id: 1, required: 1_000_000 },
        { id: 2, required: 2_000_000 },
        { id: 3, required: null },
      ],
      2_500_000,
    );
    expect(m.get(1)).toEqual({ fromSalary: 1_000_000, extra: 0 });
    expect(m.get(2)).toEqual({ fromSalary: 1_500_000, extra: 500_000 });
    expect(m.get(3)).toEqual({ fromSalary: 0, extra: 0 });
  });
});

describe("goalTimeline", () => {
  const base = { startMonth: null, deadline: null, targetAge: null, birthMonth: null, current: "2026-11" };

  it("mulai umur 30, FIRE umur 40 -> 120 bulan", () => {
    expect(monthAtAge("1996-01", 40)).toBe("2036-01");
    expect(ageAtMonth("1996-01", "2026-01")).toBe(30);
    const t = goalTimeline({ ...base, startMonth: "2026-01", targetAge: 40, birthMonth: "1996-01" });
    expect(t).toEqual({ deadline: "2036-01", totalMonths: 120, elapsedMonths: 10, monthsLeft: 110 });
  });

  it("tenggat yang diisi menang atas usia target", () => {
    const t = goalTimeline({ ...base, startMonth: "2026-11", deadline: "2027-03", targetAge: 40, birthMonth: "1996-01" });
    expect(t.deadline).toBe("2027-03");
    expect(t.totalMonths).toBe(4);
  });

  it("mulai di masa depan: sisa bulan dihitung dari bulan mulai", () => {
    const t = goalTimeline({ ...base, startMonth: "2027-01", deadline: "2028-01" });
    expect(t).toEqual({ deadline: "2028-01", totalMonths: 12, elapsedMonths: 0, monthsLeft: 12 });
  });

  it("tanpa bulan mulai: perilaku lama (dari bulan berjalan)", () => {
    const t = goalTimeline({ ...base, deadline: "2027-03" });
    expect(t).toEqual({ deadline: "2027-03", totalMonths: null, elapsedMonths: null, monthsLeft: 4 });
  });

  it("tanpa tenggat dan tanpa usia: kosong", () => {
    expect(goalTimeline({ ...base, startMonth: "2026-01" }).monthsLeft).toBeNull();
  });

  it("rencana awal dan seharusnya terkumpul", () => {
    const t = goalTimeline({ ...base, startMonth: "2026-01", targetAge: 40, birthMonth: "1996-01" });
    expect(goalPlan(1_200_000_000, t)).toEqual({ plannedMonthly: 10_000_000, expectedNow: 100_000_000 });
  });
});
