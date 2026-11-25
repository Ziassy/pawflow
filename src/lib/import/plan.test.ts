import { describe, expect, it } from "vitest";
import { buildImportPlan, planGrid, resolveCategory } from "./plan";
import { verifyMonth } from "./verify";
import { summarizeMonth } from "../money";

const CATS = ["Kebutuhan", "Cicilan", "Masa Depan", "Kebaikan", "Lainnya", "Pemasukan"];

const TRANSAKSI = `Bulan,Nama,Kategori,Jumlah (Rp),Status,Koreksi
Okt 2026,Kuota,Kebutuhan,"100,000",Tercatat,
,Uang jajan,Kebutuhan,"2,000,000",Rencana,
Okt 2026,BCA Kredit,Cicilan,"5,000,000",Tercatat,
Okt 2026,Kuota,Kebutuhan,"100,000",Tercatat,dobel di sheet
Okt 2026,Refund,kebutuhan,"(50,000)",Tercatat,refund ongkir
Okt 2026,Bonus,Pemasukan,"750,000",Tercatat,
Okt 2026,Kucing,Kebutuhan,,Tercatat,
Okt 2026,Tanpa kategori,,"10,000",Tercatat,
Okt 2026,Salah,Jajan,"10,000",Tercatat,
Bulan aneh,Kuota,Kebutuhan,"1",Tercatat,
Okt 2026,Rusak,Kebutuhan,abc,Tercatat,
,,,,,
Total,,,"7,150,000",,
`;

const RINGKASAN = `Bulan,Status,Gaji,Pemasukan,Kebutuhan,Cicilan,Masa Depan,Kebaikan,Lainnya,Total keluar,Sisa
Jul 2022,Tercatat,"5,000,000",-,"2,000,000","1,000,000","500,000",-,"(99,170)","3,400,830","1,599,170"
Okt 2026,Tercatat,"14,200,000","750,000","2,150,000","5,000,000",-,-,-,"7,150,000","7,800,000"
Okt 2026,Tercatat,"1",-,-,-,-,-,-,-,-
Rata-rata,,,,,,,,,,
`;

const RIWAYAT = `Bulan,Gaji,Pengeluaran tercatat
Jul 2022,"5,000,000","3,400,830"
Agu 2022,"5,000,000","4,100,000"
`;

const ASSET = `Jenis,Jan 2026,Feb 2026,Mar 2026
Emas,"4,298,000","4,300,000",
Bitcoin,-,"3,921,000","3,000,000"
Total,"4,298,000","8,221,000","3,000,000"
`;

describe("resolveCategory", () => {
  it("abaikan besar-kecil dan spasi", () => {
    expect(resolveCategory("masa depan", CATS)).toBe("Masa Depan");
    expect(resolveCategory("MasaDepan", CATS)).toBe("Masa Depan");
    expect(resolveCategory("Jajan", CATS)).toBeNull();
  });
});

describe("buildImportPlan", () => {
  const plan = buildImportPlan(
    { transaksi: TRANSAKSI, ringkasan: RINGKASAN, riwayatGaji: RIWAYAT, assetTracker: ASSET },
    CATS,
  );
  const errors = plan.issues.filter((i) => i.level === "error");

  it("transaksi valid diimport, isi bulan ke bawah, status -> sudah dibayar", () => {
    const okt = plan.transactions.filter((t) => t.month === "2026-10");
    expect(okt.map((t) => t.name)).toEqual(["Kuota", "Uang jajan", "BCA Kredit", "Kuota", "Refund", "Bonus", "Kucing"]);
    expect(okt.find((t) => t.name === "Uang jajan")!.isPaid).toBe(false);
    expect(okt.find((t) => t.name === "Refund")!.amount).toBe(-50_000);
    expect(okt.find((t) => t.name === "Kucing")!.amount).toBeNull();
  });

  it("baris dobel di sumber punya kunci berbeda (idempotent tanpa kehilangan baris)", () => {
    const keys = plan.transactions.filter((t) => t.name === "Kuota").map((t) => t.importKey);
    expect(new Set(keys).size).toBe(2);
    expect(keys[1]).toMatch(/:2$/);
  });

  it("baris gagal dilaporkan dengan nomor baris", () => {
    expect(errors.map((e) => `${e.file}:${e.line}`).sort()).toEqual([
      "ringkasan_bulanan.csv:4", // bulan dobel
      "transaksi.csv:10", // kategori tak dikenal
      "transaksi.csv:11", // bulan tidak valid
      "transaksi.csv:12", // nominal rusak
      "transaksi.csv:9", // tanpa kategori
    ]);
  });

  it("bulan lama tanpa rincian -> transaksi ringkasan per kategori (negatif ikut)", () => {
    const jul = plan.transactions.filter((t) => t.month === "2022-07");
    expect(jul.map((t) => [t.category, t.amount])).toEqual([
      ["Kebutuhan", 2_000_000],
      ["Cicilan", 1_000_000],
      ["Masa Depan", 500_000],
      ["Lainnya", -99_170],
    ]);
    // riwayat gaji tidak menambah transaksi untuk bulan yang sudah ada di ringkasan
    expect(plan.transactions.some((t) => t.importKey === "rg:2022-07")).toBe(false);
  });

  it("riwayat gaji mengisi bulan yang tidak ada di ringkasan", () => {
    expect(plan.periods.find((p) => p.month === "2022-08")).toEqual({ month: "2022-08", salary: 5_000_000, isPlan: false });
    expect(plan.transactions.find((t) => t.importKey === "rg:2022-08")).toMatchObject({ category: "Lainnya", amount: 4_100_000 });
  });

  it("verifikasi: total dari transaksi cocok dengan ringkasan", () => {
    const catObjs = CATS.map((name, i) => ({ id: i + 1, name, kind: name === "Pemasukan" ? "INCOME" : "EXPENSE", targetBps: 0 }));
    const idOf = (n: string) => CATS.indexOf(n) + 1;
    for (const e of plan.expectations) {
      const p = plan.periods.find((x) => x.month === e.month)!;
      const txs = plan.transactions
        .filter((t) => t.month === e.month)
        .map((t) => ({ name: t.name, categoryId: idOf(t.category), amount: t.amount, isPaid: t.isPaid }));
      const s = summarizeMonth(p.salary, txs, catObjs);
      // Okt: 100k+2jt+100k−50k = 2,15jt Kebutuhan
      expect(verifyMonth(e, s)).toEqual([]);
    }
  });

  it("verifikasi mendeteksi selisih", () => {
    const e = plan.expectations.find((x) => x.month === "2026-10")!;
    const catObjs = CATS.map((name, i) => ({ id: i + 1, name, kind: name === "Pemasukan" ? "INCOME" : "EXPENSE", targetBps: 0 }));
    const s = summarizeMonth(14_200_000, [{ name: "x", categoryId: 1, amount: 2_000_000, isPaid: true }], catObjs);
    const fields = verifyMonth(e, s).map((m) => m.field);
    expect(fields).toContain("Kebutuhan");
    expect(fields).toContain("Cicilan");
    expect(fields).toContain("Sisa");
  });
});

describe("planGrid", () => {
  it("sel kosong tidak dianggap 0, '-' = 0, baris Total dilewati", () => {
    const cells = planGrid(ASSET, { categories: [], issues: [] }, "asset_tracker.csv");
    expect(cells.map((c) => `${c.label}:${c.month}:${c.value}`)).toEqual([
      "Emas:2026-01:4298000",
      "Emas:2026-02:4300000",
      "Bitcoin:2026-01:0",
      "Bitcoin:2026-02:3921000",
      "Bitcoin:2026-03:3000000",
    ]);
  });
});
