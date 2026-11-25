import { describe, expect, it } from "vitest";
import { allocationByType, assetMonthTotals, changeRatio, isBigDrop, profitRatio, valueByAssetType } from "./investment";

describe("profitRatio (aturan 5)", () => {
  it("contoh spreadsheet", () => {
    expect(profitRatio(5_125_000, 4_298_000)).toBeCloseTo(-0.1614, 4);
    expect(profitRatio(1_046_234, 778_000)).toBeCloseTo(-0.2564, 4);
    expect(profitRatio(5_000_000, 5_000_000)).toBe(0);
  });
  it("modal 0 atau nilai akhir kosong -> null, bukan error", () => {
    expect(profitRatio(0, 1_000)).toBeNull();
    expect(profitRatio(1_358_686, null)).toBeNull();
  });
});

describe("allocationByType", () => {
  it("total & persentase, nilai kosong pakai modal", () => {
    const a = allocationByType([
      { assetType: "Emas", principal: 5_125_000, currentValue: 4_298_000 },
      { assetType: "Bitcoin", principal: 4_000_000, currentValue: 3_921_000 },
      { assetType: "Dana Darurat", principal: 15_000_000, currentValue: null },
      { assetType: "Emas", principal: 1_000_000, currentValue: 1_000_000 },
    ]);
    expect(a.total).toBe(4_298_000 + 3_921_000 + 15_000_000 + 1_000_000);
    expect(a.rows[0].type).toBe("Dana Darurat");
    const emas = a.rows.find((r) => r.type === "Emas")!;
    expect(emas.value).toBe(5_298_000);
    expect(a.rows.reduce((s, r) => s + (r.share ?? 0), 0)).toBeCloseTo(1);
  });
});

describe("asset tracker", () => {
  it("bulan kosong = null, bukan 0", () => {
    const t = assetMonthTotals(["2026-01", "2026-02"], [{ month: "2026-01", assetTypeId: 1, value: 100 }]);
    expect(t.get("2026-01")).toBe(100);
    expect(t.get("2026-02")).toBeNull();
  });
  it("peringatan turun > 30%", () => {
    expect(changeRatio(100, 60)).toBeCloseTo(-0.4);
    expect(isBigDrop(100, 69, 3000)).toBe(true);
    expect(isBigDrop(100, 70, 3000)).toBe(false);
    expect(isBigDrop(null, 10, 3000)).toBe(false);
    expect(isBigDrop(0, 10, 3000)).toBe(false);
  });
});

describe("valueByAssetType", () => {
  it("menjumlah per jenis, nilai kosong pakai modal, tanpa jenis dipisah", () => {
    const r = valueByAssetType([
      { assetTypeId: 1, principal: 100, currentValue: 120 },
      { assetTypeId: 1, principal: 50, currentValue: null },
      { assetTypeId: 2, principal: 10, currentValue: 0 },
      { assetTypeId: null, principal: 30, currentValue: 40 },
    ]);
    expect([...r.byType]).toEqual([
      [1, 170],
      [2, 0],
    ]);
    expect(r.unassigned).toBe(40);
  });
});
