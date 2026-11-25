// Kalkulator target & FIRE (murni).

/** Usia (tahun penuh) pada tanggal tertentu. */
export function ageAt(birth: Date, at: Date): number {
  let age = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) age--;
  return age;
}

/** Sisa bulan sampai usia target (dari bulan berjalan). Bisa negatif jika sudah lewat. */
export function monthsUntilAge(birth: Date, targetAge: number, now: Date): number {
  const targetY = birth.getFullYear() + targetAge;
  return (targetY - now.getFullYear()) * 12 + (birth.getMonth() - now.getMonth());
}

export type FireInput = {
  target: number;
  collected: number;
  monthsLeft: number | null;
  /** Bunga deposito per tahun, basis poin (750 = 7,5%) */
  rateBps: number;
  /** Pajak bunga, basis poin (2000 = 20%) */
  taxBps: number;
};

export type FireResult = {
  remaining: number;
  progress: number | null;
  /** Bunga per bulan dari dana target saat tercapai */
  monthlyInterestGross: number;
  monthlyInterestNet: number;
  /** Tabungan per bulan yang dibutuhkan (tanpa bunga) */
  requiredMonthly: number | null;
  /** Tabungan per bulan jika ditabung di deposito (bunga bersih, majemuk bulanan) */
  requiredMonthlyWithInterest: number | null;
};

export function fire({ target, collected, monthsLeft, rateBps, taxBps }: FireInput): FireResult {
  const remaining = Math.max(0, target - collected);
  const grossYear = (target * rateBps) / 10000;
  const monthlyInterestGross = Math.round(grossYear / 12);
  const monthlyInterestNet = Math.round((grossYear * (1 - taxBps / 10000)) / 12);
  let requiredMonthly: number | null = null;
  let requiredMonthlyWithInterest: number | null = null;
  if (monthsLeft !== null && monthsLeft > 0) {
    requiredMonthly = Math.ceil(remaining / monthsLeft);
    const r = (rateBps / 10000) * (1 - taxBps / 10000) / 12;
    // Nilai masa depan: tabungan yang sudah ada juga ikut berbunga
    const fvCollected = collected * Math.pow(1 + r, monthsLeft);
    const need = Math.max(0, target - fvCollected);
    requiredMonthlyWithInterest = r > 0 ? Math.ceil((need * r) / (Math.pow(1 + r, monthsLeft) - 1)) : requiredMonthly;
  } else if (monthsLeft !== null && remaining === 0) {
    requiredMonthly = 0;
    requiredMonthlyWithInterest = 0;
  }
  return {
    remaining,
    progress: target > 0 ? Math.min(1, collected / target) : null,
    monthlyInterestGross,
    monthlyInterestNet,
    requiredMonthly,
    requiredMonthlyWithInterest,
  };
}

/**
 * "Tangga ternak uang": kapasitas tabungan dari gaji dialokasikan berurutan
 * sesuai prioritas. Sisanya harus dari uang tambahan.
 */
export function allocateFromSalary(
  goals: { id: number; required: number | null }[],
  capacity: number,
): Map<number, { fromSalary: number; extra: number }> {
  let left = Math.max(0, capacity);
  const out = new Map<number, { fromSalary: number; extra: number }>();
  for (const g of goals) {
    const req = g.required ?? 0;
    const fromSalary = Math.min(req, left);
    left -= fromSalary;
    out.set(g.id, { fromSalary, extra: req - fromSalary });
  }
  return out;
}
