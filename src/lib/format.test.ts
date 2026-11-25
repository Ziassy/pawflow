import { describe, expect, it } from "vitest";
import {
  addMonths,
  formatBps,
  formatMonth,
  formatPercent,
  formatRupiah,
  formatRupiahShort,
  isMonthKey,
  monthDiff,
} from "./format";

describe("formatRupiah", () => {
  it("memformat tanpa desimal dengan titik ribuan", () => {
    expect(formatRupiah(14200000)).toBe("Rp14.200.000");
    expect(formatRupiah(0)).toBe("Rp0");
    expect(formatRupiah(999)).toBe("Rp999");
  });
  it("negatif dan kosong", () => {
    expect(formatRupiah(-99170)).toBe("-Rp99.170");
    expect(formatRupiah(null)).toBe("–");
  });
  it("bigint di atas batas Int", () => {
    expect(formatRupiah(5_000_000_000n)).toBe("Rp5.000.000.000");
  });
});

describe("formatRupiahShort", () => {
  it("jt / rb / M", () => {
    expect(formatRupiahShort(14200000)).toBe("Rp14,2jt");
    expect(formatRupiahShort(5000000)).toBe("Rp5jt");
    expect(formatRupiahShort(413000)).toBe("Rp413rb");
    expect(formatRupiahShort(20900000)).toBe("Rp20,9jt");
    expect(formatRupiahShort(1_500_000_000)).toBe("Rp1,5M");
  });
});

describe("persen", () => {
  it("bps & rasio", () => {
    expect(formatBps(4000)).toBe("40%");
    expect(formatBps(750)).toBe("7,5%");
    expect(formatPercent(-0.1924)).toBe("-19,24%");
    expect(formatPercent(null)).toBe("–");
    expect(formatPercent(Infinity)).toBe("–");
  });
});

describe("bulan", () => {
  it("format & validasi", () => {
    expect(formatMonth("2026-10")).toBe("Okt 2026");
    expect(formatMonth("2027-08")).toBe("Agu 2027");
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
  });
  it("aritmatika", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2022-07", 27)).toBe("2024-10");
    expect(monthDiff("2026-11", "2027-03")).toBe(4);
  });
});
