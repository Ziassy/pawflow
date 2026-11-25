import { describe, expect, it } from "vitest";
import { findColumn, parseAmount, parseCsv, parseMonth } from "./parse";

const v = (s: string) => {
  const r = parseAmount(s);
  return "value" in r ? r.value : "ERR";
};

describe("parseAmount", () => {
  it("format en-US dari Google Sheets", () => {
    expect(v("14,200,000")).toBe(14_200_000);
    expect(v("14,200,000.00")).toBe(14_200_000);
    expect(v("15,087,000.00")).toBe(15_087_000);
    expect(v("999")).toBe(999);
  });
  it("negatif dalam kurung", () => {
    expect(v("(99,170)")).toBe(-99_170);
    expect(v("(1,000.00)")).toBe(-1_000);
    expect(v("-5,000")).toBe(-5_000);
  });
  it("strip = nol, kosong = null, error rumus = null", () => {
    expect(v("-")).toBe(0);
    expect(v(" - ")).toBe(0);
    expect(v("")).toBeNull();
    expect(v("#DIV/0!")).toBeNull();
  });
  it("format Indonesia & awalan Rp", () => {
    expect(v("14.200.000")).toBe(14_200_000);
    expect(v("Rp14.200.000")).toBe(14_200_000);
    expect(v("Rp 1.500.000,00")).toBe(1_500_000);
    expect(v("-Rp99.170")).toBe(-99_170);
  });
  it("pembulatan desimal", () => {
    expect(v("1234.56")).toBe(1235);
  });
  it("tidak dikenali -> error", () => {
    expect(v("abc")).toBe("ERR");
    expect(v("12,34,5")).toBe("ERR");
  });
});

describe("parseMonth", () => {
  it.each([
    ["2026-10", "2026-10"],
    ["2026/1", "2026-01"],
    ["10/2026", "2026-10"],
    ["Okt 2026", "2026-10"],
    ["Oktober 2026", "2026-10"],
    ["Oct-26", "2026-10"],
    ["Jul 2022", "2022-07"],
    ["agustus 2027", "2027-08"],
    ["Mei 2025", "2025-05"],
    ["10/1/2026", "2026-10"],
    ["2026-10-01", "2026-10"],
  ])("%s -> %s", (input, out) => {
    expect(parseMonth(input)).toBe(out);
  });
  it("tidak valid", () => {
    expect(parseMonth("")).toBeNull();
    expect(parseMonth("Total")).toBeNull();
    expect(parseMonth("2026-13")).toBeNull();
  });
});

describe("parseCsv", () => {
  it("kutip, koma dalam kutip, CRLF, BOM", () => {
    expect(parseCsv('﻿a,b\r\n"1,000","say ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["1,000", 'say "hi"'],
    ]);
  });
  it("baris baru dalam kutip & baris terakhir tanpa newline", () => {
    expect(parseCsv('x,"a\nb"\ny,z')).toEqual([
      ["x", "a\nb"],
      ["y", "z"],
    ]);
  });
});

describe("findColumn", () => {
  it("cocokkan header longgar", () => {
    const h = ["Bulan", "Nama", "Kategori", "Jumlah (Rp)", "Status", "Koreksi"];
    expect(findColumn(h, ["jumlah"])).toBe(3);
    expect(findColumn(h, ["Masa Depan"])).toBe(-1);
  });
});
