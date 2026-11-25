import { describe, expect, it } from "vitest";
import {
  averageSisa,
  findDuplicate,
  parseRupiahInput,
  periodStatus,
  summarizeMonth,
  targetFromBps,
  type CategoryLite,
} from "./money";

const CATS: CategoryLite[] = [
  { id: 1, name: "Kebutuhan", kind: "EXPENSE", targetBps: 4000 },
  { id: 2, name: "Cicilan", kind: "EXPENSE", targetBps: 3000 },
  { id: 3, name: "Masa Depan", kind: "EXPENSE", targetBps: 2000 },
  { id: 4, name: "Kebaikan", kind: "EXPENSE", targetBps: 1000 },
  { id: 5, name: "Lainnya", kind: "EXPENSE", targetBps: 0 },
  { id: 6, name: "Pemasukan", kind: "INCOME", targetBps: 0 },
];

describe("summarizeMonth", () => {
  const txs = [
    { name: "Kuota", categoryId: 1, amount: 100_000, isPaid: true },
    { name: "Uang jajan", categoryId: 1, amount: 2_000_000, isPaid: false },
    { name: "BCA Kredit", categoryId: 2, amount: 5_000_000, isPaid: true },
    { name: "Investasi", categoryId: 3, amount: 3_000_000, isPaid: true },
    { name: "Mom", categoryId: 4, amount: 1_500_000, isPaid: true },
    { name: "Bonus", categoryId: 6, amount: 750_000, isPaid: false },
    { name: "Kucing", categoryId: 1, amount: null, isPaid: false },
  ];

  it("sisa = gaji + pemasukan − pengeluaran (termasuk yang belum dibayar)", () => {
    const s = summarizeMonth(14_200_000, txs, CATS);
    expect(s.income).toBe(750_000);
    expect(s.expense).toBe(11_600_000);
    expect(s.sisa).toBe(14_200_000 + 750_000 - 11_600_000);
    expect(s.unpaid).toBe(2_000_000); // pemasukan tidak dihitung "belum dibayar"
    expect(s.unpaidCount).toBe(1);
    expect(s.missingAmountCount).toBe(1);
  });

  it("pemasukan tidak pernah masuk pengeluaran / budget", () => {
    const s = summarizeMonth(14_200_000, txs, CATS);
    expect(s.byCategory.map((b) => b.name)).not.toContain("Pemasukan");
  });

  it("budget per kategori: target = % × gaji, tandai melebihi", () => {
    const s = summarizeMonth(10_000_000, txs, CATS);
    const keb = s.byCategory.find((b) => b.name === "Kebutuhan")!;
    expect(keb.actual).toBe(2_100_000);
    expect(keb.target).toBe(4_000_000);
    expect(keb.shareOfSalary).toBeCloseTo(0.21);
    expect(keb.over).toBe(false);
    const kebaikan = s.byCategory.find((b) => b.name === "Kebaikan")!;
    expect(kebaikan.target).toBe(1_000_000);
    expect(kebaikan.over).toBe(true);
    expect(kebaikan.usage).toBeCloseTo(1.5);
    const lain = s.byCategory.find((b) => b.name === "Lainnya")!;
    expect(lain.target).toBeNull();
    expect(lain.usage).toBeNull();
  });

  it("gaji kosong: sisa dihitung dengan gaji 0, persentase null", () => {
    const s = summarizeMonth(null, [{ name: "X", categoryId: 1, amount: 50_000, isPaid: true }], CATS);
    expect(s.sisa).toBe(-50_000);
    expect(s.byCategory[0].shareOfSalary).toBeNull();
    expect(s.byCategory[0].target).toBeNull();
  });

  it("kategori tak dikenal -> error (setiap transaksi wajib berkategori)", () => {
    expect(() => summarizeMonth(1, [{ name: "X", categoryId: 99, amount: 1, isPaid: true }], CATS)).toThrow();
  });
});

describe("targetFromBps", () => {
  it("membulatkan", () => {
    expect(targetFromBps(14_200_000, 4000)).toBe(5_680_000);
    expect(targetFromBps(3_333_333, 1250)).toBe(416_667);
  });
});

describe("periodStatus", () => {
  it("rencana > tidak lengkap > tercatat", () => {
    expect(periodStatus(true, null, 3)).toBe("Rencana");
    expect(periodStatus(false, 1, 1)).toBe("Tidak lengkap");
    expect(periodStatus(false, null, 0)).toBe("Tidak lengkap");
    expect(periodStatus(false, 1, 0)).toBe("Tercatat");
  });
});

describe("averageSisa", () => {
  it("hanya bulan Tercatat", () => {
    expect(
      averageSisa([
        { status: "Tercatat", sisa: 400_000 },
        { status: "Tercatat", sisa: 426_000 },
        { status: "Rencana", sisa: 9_000_000 },
        { status: "Tidak lengkap", sisa: -5_000_000 },
      ]),
    ).toBe(413_000);
    expect(averageSisa([{ status: "Rencana", sisa: 1 }])).toBeNull();
  });
});

describe("findDuplicate", () => {
  const existing = [
    { id: 1, name: "Kuota", amount: 100_000 },
    { id: 2, name: "BPJS  Kesehatan", amount: null },
  ];
  it("nama (abaikan besar-kecil & spasi) + nominal sama", () => {
    expect(findDuplicate(existing, { name: " kuota ", amount: 100_000 })?.id).toBe(1);
    expect(findDuplicate(existing, { name: "Kuota", amount: 120_000 })).toBeUndefined();
    expect(findDuplicate(existing, { name: "bpjs kesehatan", amount: null })?.id).toBe(2);
  });
  it("abaikan baris yang sedang diedit", () => {
    expect(findDuplicate(existing, { name: "Kuota", amount: 100_000 }, 1)).toBeUndefined();
  });
});

describe("parseRupiahInput", () => {
  it("angka biasa dan pemisah ribuan", () => {
    expect(parseRupiahInput("14.200.000")).toBe(14_200_000);
    expect(parseRupiahInput("14,200,000")).toBe(14_200_000);
    expect(parseRupiahInput("Rp 50000")).toBe(50_000);
    expect(parseRupiahInput("")).toBeNull();
  });
  it("singkatan rb/jt/M", () => {
    expect(parseRupiahInput("50rb")).toBe(50_000);
    expect(parseRupiahInput("1,5jt")).toBe(1_500_000);
    expect(parseRupiahInput("1.5 jt")).toBe(1_500_000);
    expect(parseRupiahInput("2M")).toBe(2_000_000_000);
  });
  it("negatif = koreksi", () => {
    expect(parseRupiahInput("-99.170")).toBe(-99_170);
    expect(parseRupiahInput("-Rp50rb")).toBe(-50_000);
  });
  it("tidak valid", () => {
    expect(parseRupiahInput("abc")).toBeNaN();
    expect(parseRupiahInput("1.50")).toBeNaN();
    expect(parseRupiahInput("-")).toBeNaN();
  });
});

import { caretAfterFormat, formatTyping } from "./money";

describe("formatTyping", () => {
  it("titik ribuan saat mengetik", () => {
    expect(formatTyping("14200000")).toBe("14.200.000");
    expect(formatTyping("14.2000")).toBe("142.000");
    expect(formatTyping("1000")).toBe("1.000");
    expect(formatTyping("007")).toBe("7");
    expect(formatTyping("-99170")).toBe("-99.170");
    expect(formatTyping("")).toBe("");
    expect(formatTyping("-")).toBe("-");
  });
  it("singkatan tidak diubah", () => {
    expect(formatTyping("1,5jt")).toBe("1,5jt");
    expect(formatTyping("50rb")).toBe("50rb");
  });
  it("kursor tetap setelah digit yang sama", () => {
    // ketik "4" di akhir "1.000" -> "10004" -> "10.004", kursor di akhir
    expect(caretAfterFormat("1.0004", 6, "10.004")).toBe(6);
    // kursor setelah digit ke-2 dari "142000"
    expect(caretAfterFormat("142000", 2, "142.000")).toBe(2);
    expect(caretAfterFormat("142000", 4, "142.000")).toBe(5);
  });
});
