// Logika Dashboard (murni): selisih KPI & kalimat ringkasan otomatis.
import { formatMonth, formatRupiahShort } from "./format";

export type Delta = { diff: number; ratio: number | null };

/** Selisih vs bulan sebelumnya; null jika salah satu tidak ada. */
export function delta(curr: number | null, prev: number | null): Delta | null {
  if (curr === null || prev === null) return null;
  return { diff: curr - prev, ratio: prev !== 0 ? (curr - prev) / Math.abs(prev) : null };
}

export type SummaryInput = {
  firstSalary: { month: string; value: number } | null;
  refSalary: { month: string; value: number } | null;
  avgSisa: { year: string; value: number; months: number } | null;
  debtTotal: number | null;
  debtPayoff: string | null;
};

/**
 * Contoh: "Gaji naik dari Rp5jt (Jul 2022) ke Rp14,2jt. Rata-rata sisa gaji 2026 (bulan lengkap) Rp413rb.
 * Hutang kartu Rp20,9jt, rencana lunas Mar 2027."
 */
export function summarySentence(i: SummaryInput): string {
  const parts: string[] = [];
  if (i.firstSalary && i.refSalary && i.firstSalary.month !== i.refSalary.month) {
    const verb = i.refSalary.value > i.firstSalary.value ? "naik" : i.refSalary.value < i.firstSalary.value ? "turun" : "tetap";
    parts.push(
      verb === "tetap"
        ? `Gaji tetap ${formatRupiahShort(i.refSalary.value)} sejak ${formatMonth(i.firstSalary.month)}.`
        : `Gaji ${verb} dari ${formatRupiahShort(i.firstSalary.value)} (${formatMonth(i.firstSalary.month)}) ke ${formatRupiahShort(i.refSalary.value)}.`,
    );
  } else if (i.refSalary) {
    parts.push(`Gaji ${formatMonth(i.refSalary.month)} ${formatRupiahShort(i.refSalary.value)}.`);
  }
  if (i.avgSisa) {
    parts.push(`Rata-rata sisa gaji ${i.avgSisa.year} (bulan lengkap) ${formatRupiahShort(i.avgSisa.value)}.`);
  }
  if (i.debtTotal !== null && i.debtTotal > 0) {
    parts.push(
      `Hutang kartu ${formatRupiahShort(i.debtTotal)}, ${i.debtPayoff ? `rencana lunas ${formatMonth(i.debtPayoff)}` : "belum ada rencana lunas"}.`,
    );
  } else if (i.debtTotal === 0) {
    parts.push("Hutang kartu sudah lunas.");
  }
  return parts.join(" ") || "Belum ada data. Mulai dari menu Bulanan atau jalankan import.";
}
