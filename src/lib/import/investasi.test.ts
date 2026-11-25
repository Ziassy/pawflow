import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { planInvestasi } from "./investasi";

// Struktur sama dengan sheet "Investasi" lama (dipangkas).
const CSV = `,,,,,,,,,,,,,,,,
INVESTASI,,Update Date,,09/28/2026,,,TOTAL ASSET ,,"15,087,000.00",,,,CASH Liquid,"5,000,000.00",,
,,,,,,,,,,,,,,,,
Platform,Type,Jenis Investasi, Harga Awal , Akhir , Persentase Profit ,,,,,,,,Target Portofolio,Nilai,Hasil Akhir,Return
Emas Fisik,2gram galeri24,Emas,"5,125,000.00","4,298,000.00",-19.24%,,,,,,,,BTC,"600,000.00",,
Krom,Th ai II,,"1,358,686.00",,#DIV/0!,,Total Per Jenis Investasi,Total,W.A.,,,,Saham Indonesia,"600,000.00",,
Krom,,Tabungan Jarak Dekat (Cash),"5,000,000.00","5,000,000.00",0.00%,,Deposito,0.00,0%,,,,Emas,"500,000.00",,
Permata Bank,,Bank,"1,100,000.00","1,090,000.00",-0.92%,"10,000.00",Cash,0.00,0%,,,,Currency ,"300,000.00",,
Superbank,,Dana Darurat,"15,000,000.00",,#DIV/0!,"15,000,000.00",Emas Dana Darurat,0.00,0%,,,,,,,
,Sheila,,"400,000.00",,#DIV/0!,,Emas,"4,298,000.00",28%,,,,ASSET,"48,300,000.00",,
,,,,,#DIV/0!,,,,,,,,Nama Asset,Nilai,,
,,,,,#DIV/0!,,,,,,,,,,,
,,,,,#DIV/0!,,,,,,,,Iphone 14,"14,000,000.00",,
,,,,,#DIV/0!,,,,,,,,HDD External 2TB,"1,200,000.00",,
,,,,,,,Tangga ternak Uang,,Terkumpul,Kurang,,,,,,
,,,,,#DIV/0!,,Tabungan Jarak Dekat (Cash),"5,000,000.00","5,000,000.00",0.00,,,,,,
,,,,,#DIV/0!,,Pensiun,"1,000,000,000.00","4,298,000.00","995,702,000.00",,,,,,
,,,,,,,,,,,,,,,,
,,,,,,,Goals,,,,,,,,,
,,,,,#DIV/0!,,,,,,,,,,,
,,,,,#DIV/0!,,"1. Punya return, cash 5 milyar",,,,,,,,,
,,,,,#DIV/0!,,2. Rumah,,,,,,,,,
,,,,,,,,,,,,,,,,
`;

describe("planInvestasi", () => {
  const p = planInvestasi(CSV);
  it("tanggal update -> bulan", () => {
    expect(p.month).toBe("2026-09");
  });
  it("baris dengan jenis -> investasi, alias platform & jenis", () => {
    expect(p.investments.map((i) => [i.platform, i.assetType, i.principal, i.currentValue])).toEqual([
      ["Emas fisik", "Emas", 5_125_000, 4_298_000],
      ["Krom", "Tabungan Jarak Dekat", 5_000_000, 5_000_000],
      ["Permata", "Bank", 1_100_000, 1_090_000],
      ["Superbank", "Dana Darurat", 15_000_000, null],
    ]);
  });
  it("baris tanpa jenis -> piutang", () => {
    expect(p.receivables.map((r) => [r.name, r.principal, r.platform])).toEqual([
      ["Th ai II", 1_358_686, "Krom"],
      ["Sheila", 400_000, null],
    ]);
  });
  it("target portofolio, aset fisik, tangga, goals", () => {
    expect(p.targets.map((t) => [t.assetType, t.amount])).toEqual([
      ["Bitcoin", 600_000],
      ["Saham Indonesia", 600_000],
      ["Emas", 500_000],
      ["USDC", 300_000],
    ]);
    expect(p.physical.map((x) => x.name)).toEqual(["Iphone 14", "HDD External 2TB"]);
    expect(p.goals).toMatchObject([
      { name: "Tabungan Jarak Dekat (Cash)", target: 5_000_000, collected: 5_000_000 },
      { name: "Pensiun", target: 1_000_000_000, collected: 4_298_000 },
    ]);
    expect(p.resolutions.map((r) => r.text)).toEqual(["Punya return, cash 5 milyar", "Rumah"]);
  });
  it("file asli bisa diparse tanpa error", () => {
    let text: string;
    try {
      const f = readdirSync("data").find((n) => /investasi.*\.csv$/i.test(n));
      if (!f) return; // file pribadi tidak ada di CI
      text = readFileSync(`data/${f}`, "utf8");
    } catch {
      return;
    }
    const real = planInvestasi(text);
    expect(real.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(real.investments.length).toBeGreaterThan(0);
  });
});
