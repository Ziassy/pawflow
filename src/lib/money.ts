// Perhitungan uang murni (tanpa DB) — semua total diturunkan dari baris transaksi.
// Semua nominal integer Rupiah.

import type { PeriodStatus } from "./constants";

export type CategoryLite = {
  id: number;
  name: string;
  kind: string; // "EXPENSE" | "INCOME"
  targetBps: number;
  color?: string;
};

export type TxLite = {
  name: string;
  categoryId: number;
  amount: number | null;
  isPaid: boolean;
};

export type CategoryBudget = {
  categoryId: number;
  name: string;
  color?: string;
  actual: number;
  /** Target Rupiah = gaji × targetBps; null jika tidak ada target atau gaji kosong */
  target: number | null;
  targetBps: number;
  /** actual / gaji; null jika gaji kosong/0 */
  shareOfSalary: number | null;
  /** actual / target; null jika tidak ada target */
  usage: number | null;
  over: boolean;
};

export type MonthSummary = {
  salary: number | null;
  /** Uang masuk selain gaji (kategori INCOME) */
  income: number;
  /** Total pengeluaran (semua kategori EXPENSE, dibayar atau belum) */
  expense: number;
  /** Gaji + Pemasukan − Pengeluaran */
  sisa: number;
  /** Pengeluaran yang belum dicentang "sudah dibayar" */
  unpaid: number;
  unpaidCount: number;
  /** Jumlah transaksi tanpa nominal */
  missingAmountCount: number;
  byCategory: CategoryBudget[];
};

/** Target Rupiah dari gaji dan basis poin, dibulatkan ke rupiah terdekat. */
export function targetFromBps(salary: number, bps: number): number {
  return Math.round((salary * bps) / 10000);
}

export function summarizeMonth(
  salary: number | null,
  txs: TxLite[],
  categories: CategoryLite[],
): MonthSummary {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const actualByCat = new Map<number, number>();
  let income = 0;
  let expense = 0;
  let unpaid = 0;
  let unpaidCount = 0;
  let missingAmountCount = 0;

  for (const t of txs) {
    const cat = catById.get(t.categoryId);
    if (!cat) throw new Error(`Kategori ${t.categoryId} tidak dikenal untuk "${t.name}"`);
    if (t.amount === null) {
      missingAmountCount++;
      continue;
    }
    actualByCat.set(cat.id, (actualByCat.get(cat.id) ?? 0) + t.amount);
    if (cat.kind === "INCOME") {
      income += t.amount;
    } else {
      expense += t.amount;
      if (!t.isPaid) {
        unpaid += t.amount;
        unpaidCount++;
      }
    }
  }

  const sal = salary ?? 0;
  const byCategory: CategoryBudget[] = categories
    .filter((c) => c.kind !== "INCOME")
    .map((c) => {
      const actual = actualByCat.get(c.id) ?? 0;
      const target = c.targetBps > 0 && sal > 0 ? targetFromBps(sal, c.targetBps) : null;
      return {
        categoryId: c.id,
        name: c.name,
        color: c.color,
        actual,
        target,
        targetBps: c.targetBps,
        shareOfSalary: sal > 0 ? actual / sal : null,
        usage: target ? actual / target : null,
        over: target !== null && actual > target,
      };
    });

  return {
    salary,
    income,
    expense,
    sisa: sal + income - expense,
    unpaid,
    unpaidCount,
    missingAmountCount,
    byCategory,
  };
}

/**
 * Status bulan, diturunkan:
 * - Rencana: bulan ditandai rencana
 * - Tidak lengkap: ada transaksi tanpa nominal, atau gaji belum diisi
 * - Tercatat: selain itu
 */
export function periodStatus(isPlan: boolean, salary: number | null, missingAmountCount: number): PeriodStatus {
  if (isPlan) return "Rencana";
  if (salary === null || missingAmountCount > 0) return "Tidak lengkap";
  return "Tercatat";
}

/** Rata-rata sisa (dibulatkan) dari bulan Tercatat saja. null jika tidak ada. */
export function averageSisa(rows: { status: PeriodStatus; sisa: number }[]): number | null {
  const ok = rows.filter((r) => r.status === "Tercatat");
  if (ok.length === 0) return null;
  return Math.round(ok.reduce((s, r) => s + r.sisa, 0) / ok.length);
}

/** Normalisasi nama untuk cek duplikat: trim, huruf kecil, spasi tunggal. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Aturan 4: nama + nominal (+ bulan, dicek pemanggil) sama -> duplikat. */
export function findDuplicate<T extends { id?: number; name: string; amount: number | null }>(
  existing: T[],
  candidate: { name: string; amount: number | null },
  ignoreId?: number,
): T | undefined {
  const n = normalizeName(candidate.name);
  return existing.find(
    (t) => t.id !== ignoreId && normalizeName(t.name) === n && t.amount === candidate.amount,
  );
}

/**
 * Parse input nominal dari pengguna:
 * "14.200.000" | "14,200,000" | "14200000" | "50rb" | "1,5jt" | "1.5 jt" | "2M" -> integer Rupiah.
 * Awalan "-" = negatif (koreksi). Kosong -> null. Tidak valid -> NaN.
 */
export function parseRupiahInput(raw: string): number | null {
  let s = raw.trim().toLowerCase().replace(/\s+/g, "");
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  s = s.replace(/^rp\.?/, "");
  if (s === "") return neg ? NaN : null;
  const v = parsePositive(s);
  return neg && !Number.isNaN(v) ? -v : v;
}

function parsePositive(s: string): number {
  const m = /^([\d.,]+)(rb|ribu|k|jt|juta|m|milyar|miliar)?$/.exec(s);
  if (!m) return NaN;
  const [, num, unit] = m;
  if (!unit) {
    // Tanpa satuan: titik/koma dianggap pemisah ribuan
    if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(num)) return NaN;
    return Number(num.replace(/[.,]/g, ""));
  }
  // Dengan satuan: koma/titik terakhir = desimal ("1,5jt")
  const dec = Number(num.replace(",", "."));
  if (!Number.isFinite(dec)) return NaN;
  const mult = { rb: 1e3, ribu: 1e3, k: 1e3, jt: 1e6, juta: 1e6, m: 1e9, milyar: 1e9, miliar: 1e9 }[unit]!;
  return Math.round(dec * mult);
}

/**
 * Format saat mengetik: "14200000" -> "14.200.000".
 * Hanya angka (dan "-" di depan) yang diformat; teks singkatan seperti "1,5jt" / "50rb" dibiarkan.
 */
export function formatTyping(raw: string): string {
  const t = raw.replace(/\s+/g, "");
  if (!/^-?[\d.]*$/.test(t)) return raw;
  const neg = t.startsWith("-");
  const digits = t.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return neg ? "-" : "";
  return (neg ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Posisi kursor baru setelah format: pertahankan jumlah digit di kiri kursor. */
export function caretAfterFormat(before: string, caret: number, after: string): number {
  const digitsLeft = before.slice(0, caret).replace(/[^\d-]/g, "").length;
  if (digitsLeft === 0) return 0;
  let seen = 0;
  for (let i = 0; i < after.length; i++) {
    if (/[\d-]/.test(after[i])) seen++;
    if (seen === digitsLeft) return i + 1;
  }
  return after.length;
}
