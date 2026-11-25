import { describe, expect, it } from "vitest";
import { ageAt, allocateFromSalary, fire, monthsUntilAge } from "./fire";

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
