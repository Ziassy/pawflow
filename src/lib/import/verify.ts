import type { MonthSummary } from "../money";
import { INCOME, type Expectation } from "./plan";

export type Mismatch = { month: string; line: number; field: string; expected: number; actual: number };

/**
 * Bandingkan angka ringkasan_bulanan.csv dengan hasil hitung dari transaksi.
 * Nilai kosong di CSV dianggap 0 untuk kategori; Total/Sisa hanya dicek jika kolomnya ada.
 */
export function verifyMonth(e: Expectation, s: MonthSummary | undefined): Mismatch[] {
  const out: Mismatch[] = [];
  const push = (field: string, expected: number | null | undefined, actual: number, nullAsZero = true) => {
    if (expected === undefined) return;
    if (expected === null && !nullAsZero) return;
    const exp = expected ?? 0;
    if (exp !== actual) out.push({ month: e.month, line: e.line, field, expected: exp, actual });
  };
  if (!s) {
    out.push({ month: e.month, line: e.line, field: "bulan", expected: 1, actual: 0 });
    return out;
  }
  push("Gaji", e.salary, s.salary ?? 0, false);
  for (const [cat, expected] of Object.entries(e.byCategory)) {
    if (cat === INCOME) push(INCOME, expected, s.income);
    else push(cat, expected, s.byCategory.find((b) => b.name === cat)?.actual ?? 0);
  }
  push("Total keluar", e.totalExpense, s.expense, false);
  push("Sisa", e.sisa, s.sisa, false);
  return out;
}
