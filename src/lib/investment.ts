// Perhitungan investasi & aset (murni).

/** Aturan 5: (Nilai Akhir − Modal) / Modal. Modal 0 atau nilai akhir kosong -> null ("–"). */
export function profitRatio(principal: number, currentValue: number | null): number | null {
  if (currentValue === null || !principal) return null;
  return (currentValue - principal) / principal;
}

/** Nilai untuk total/alokasi: nilai akhir; jika kosong pakai modal. */
export function effectiveValue(principal: number, currentValue: number | null): number {
  return currentValue ?? principal;
}

export type InvestmentLite = { assetType: string | null; principal: number; currentValue: number | null };

export function allocationByType(items: InvestmentLite[]) {
  const map = new Map<string, { type: string; value: number; principal: number }>();
  for (const i of items) {
    const type = i.assetType ?? "Tanpa jenis";
    const row = map.get(type) ?? { type, value: 0, principal: 0 };
    row.value += effectiveValue(i.principal, i.currentValue);
    row.principal += i.principal;
    map.set(type, row);
  }
  const total = [...map.values()].reduce((s, r) => s + r.value, 0);
  return {
    total,
    rows: [...map.values()]
      .sort((a, b) => b.value - a.value)
      .map((r) => ({ ...r, share: total > 0 ? r.value / total : null, profit: profitRatio(r.principal, r.value) })),
  };
}

/**
 * Nilai portofolio per jenis aset (id), untuk ditulis ke Asset Tracker.
 * Posisi tanpa jenis tidak bisa dipetakan ke baris tracker -> dihitung terpisah.
 */
export function valueByAssetType(items: { assetTypeId: number | null; principal: number; currentValue: number | null }[]) {
  const byType = new Map<number, number>();
  let unassigned = 0;
  for (const i of items) {
    const v = effectiveValue(i.principal, i.currentValue);
    if (i.assetTypeId === null) unassigned += v;
    else byType.set(i.assetTypeId, (byType.get(i.assetTypeId) ?? 0) + v);
  }
  return { byType, unassigned };
}

export type AssetCell = { month: string; assetTypeId: number; value: number };

/** Total per bulan Asset Tracker; null untuk bulan tanpa isi sama sekali (bukan 0). */
export function assetMonthTotals(months: string[], cells: AssetCell[]): Map<string, number | null> {
  const out = new Map<string, number | null>();
  for (const m of months) {
    const mc = cells.filter((c) => c.month === m);
    out.set(m, mc.length ? mc.reduce((s, c) => s + c.value, 0) : null);
  }
  return out;
}

/** Perubahan relatif vs bulan sebelumnya. null jika salah satu kosong atau sebelumnya 0. */
export function changeRatio(prev: number | null, curr: number | null): number | null {
  if (prev === null || curr === null || prev === 0) return null;
  return (curr - prev) / prev;
}

/** Turun lebih dari ambang (bps, mis. 3000 = 30%). */
export function isBigDrop(prev: number | null, curr: number | null, thresholdBps: number): boolean {
  const r = changeRatio(prev, curr);
  return r !== null && r < -thresholdBps / 10000;
}
