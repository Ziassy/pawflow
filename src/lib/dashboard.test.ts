import { describe, expect, it } from "vitest";
import { delta, summarySentence } from "./dashboard";

describe("delta", () => {
  it("selisih & rasio", () => {
    expect(delta(110, 100)).toEqual({ diff: 10, ratio: 0.1 });
    expect(delta(-50, -100)).toEqual({ diff: 50, ratio: 0.5 });
    expect(delta(5, 0)).toEqual({ diff: 5, ratio: null });
    expect(delta(null, 1)).toBeNull();
  });
});

describe("summarySentence", () => {
  it("contoh dari spesifikasi", () => {
    expect(
      summarySentence({
        firstSalary: { month: "2022-07", value: 5_000_000 },
        refSalary: { month: "2026-11", value: 14_200_000 },
        avgSisa: { year: "2026", value: 413_000, months: 9 },
        debtTotal: 20_900_000,
        debtPayoff: "2027-03",
      }),
    ).toBe(
      "Gaji naik dari Rp5jt (Jul 2022) ke Rp14,2jt. Rata-rata sisa gaji 2026 (bulan lengkap) Rp413rb. Hutang kartu Rp20,9jt, rencana lunas Mar 2027.",
    );
  });
  it("tanpa rencana lunas & tanpa data", () => {
    expect(summarySentence({ firstSalary: null, refSalary: null, avgSisa: null, debtTotal: 1_000_000, debtPayoff: null })).toBe(
      "Hutang kartu Rp1jt, belum ada rencana lunas.",
    );
    expect(summarySentence({ firstSalary: null, refSalary: null, avgSisa: null, debtTotal: null, debtPayoff: null })).toMatch(/Belum ada data/);
  });
});
