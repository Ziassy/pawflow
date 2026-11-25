// Perhitungan hutang & piutang (murni). Integer Rupiah.

export type DebtSnapshotLite = { month: string; balance: number };
export type DebtPlanLite = { month: string; amount: number; paid: boolean };

export type DebtProjection = {
  /** Bulan saldo terakhir yang tercatat (null jika belum ada saldo) */
  baseMonth: string | null;
  /** Saldo pada baseMonth */
  balance: number | null;
  /** Total rencana bayar mulai baseMonth */
  plannedTotal: number;
  /** Saldo − rencana (tidak negatif); null jika saldo belum ada */
  remainingAfterPlan: number | null;
  /** Bulan pertama saat kumulatif rencana ≥ saldo; null jika belum lunas oleh rencana */
  payoffMonth: string | null;
  /** Saldo 0 sudah lunas */
  paidOff: boolean;
};

/** Saldo terakhir pada/ sebelum bulan acuan (atau terakhir sama sekali). */
export function latestSnapshot(snaps: DebtSnapshotLite[], upTo?: string): DebtSnapshotLite | null {
  let best: DebtSnapshotLite | null = null;
  for (const s of snaps) {
    if (upTo && s.month > upTo) continue;
    if (!best || s.month > best.month) best = s;
  }
  return best;
}

/**
 * Proyeksi pelunasan: saldo bulan M dianggap saldo sebelum pembayaran bulan M,
 * jadi rencana bulan ≥ M mengurangi saldo tersebut.
 */
export function projectDebt(snaps: DebtSnapshotLite[], plans: DebtPlanLite[], upTo?: string): DebtProjection {
  const base = latestSnapshot(snaps, upTo);
  const relevant = plans
    .filter((p) => !base || p.month >= base.month)
    .sort((a, b) => a.month.localeCompare(b.month));
  const plannedTotal = relevant.reduce((s, p) => s + p.amount, 0);
  if (!base) {
    return { baseMonth: null, balance: null, plannedTotal, remainingAfterPlan: null, payoffMonth: null, paidOff: false };
  }
  if (base.balance <= 0) {
    return { baseMonth: base.month, balance: base.balance, plannedTotal, remainingAfterPlan: 0, payoffMonth: base.month, paidOff: true };
  }
  let cum = 0;
  let payoffMonth: string | null = null;
  for (const p of relevant) {
    cum += p.amount;
    if (cum >= base.balance) {
      payoffMonth = p.month;
      break;
    }
  }
  return {
    baseMonth: base.month,
    balance: base.balance,
    plannedTotal,
    remainingAfterPlan: Math.max(0, base.balance - plannedTotal),
    payoffMonth,
    paidOff: false,
  };
}

/** Bulan lunas semua hutang = bulan lunas paling akhir; null jika ada yang belum terencana lunas. */
export function overallPayoff(projections: DebtProjection[]): string | null {
  let last: string | null = null;
  for (const p of projections) {
    if (p.balance === null || p.paidOff) continue;
    if (!p.payoffMonth) return null;
    if (!last || p.payoffMonth > last) last = p.payoffMonth;
  }
  return last;
}

/** Total saldo per bulan (hanya bulan yang punya saldo). Kartu tanpa saldo di bulan itu memakai saldo terakhir sebelumnya. */
export function debtTotalsByMonth(debts: DebtSnapshotLite[][]): { month: string; total: number }[] {
  const months = [...new Set(debts.flat().map((s) => s.month))].sort();
  return months.map((m) => ({
    month: m,
    total: debts.reduce((sum, snaps) => sum + (latestSnapshot(snaps, m)?.balance ?? 0), 0),
  }));
}

// ---------------------------------------------------------------------------
// Piutang
// ---------------------------------------------------------------------------

export type ReceivableSummary = {
  totalBill: number;
  profit: number;
  paid: number;
  remaining: number;
  paidCount: number;
};

export function summarizeReceivable(
  principal: number,
  installments: { amount: number; paid: boolean }[],
): ReceivableSummary {
  const totalBill = installments.reduce((s, i) => s + i.amount, 0);
  const paid = installments.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  return {
    totalBill,
    profit: totalBill - principal,
    paid,
    remaining: totalBill - paid,
    paidCount: installments.filter((i) => i.paid).length,
  };
}

/** Jadwal cicilan: n cicilan bulanan mulai startMonth. */
export function buildInstallments(startMonth: string, count: number, amount: number, addMonths: (m: string, n: number) => string) {
  return Array.from({ length: count }, (_, i) => ({ seq: i + 1, month: addMonths(startMonth, i), amount }));
}

/** Total hutang ke orang dari catatan (pinjam +, bayar −). */
export function personalDebtBalance(entries: { amount: number }[]): number {
  return entries.reduce((s, e) => s + e.amount, 0);
}

// ---------------------------------------------------------------------------
// Catatan debit/kredit (piutang BEBAS & hutang ke orang)
// ---------------------------------------------------------------------------

export type LedgerEntry = { id: number; date: Date | string; description: string; amount: number };
export type LedgerRow = LedgerEntry & { debit: number; credit: number; balance: number };

/**
 * amount > 0 = bertambah (dipinjamkan / pinjam lagi), amount < 0 = berkurang (dibayar).
 * Urut tanggal lalu id, saldo berjalan seperti mutasi rekening.
 */
export function ledger(entries: LedgerEntry[]): { rows: LedgerRow[]; totalDebit: number; totalCredit: number; balance: number } {
  const sorted = [...entries].sort((a, b) => {
    const d = new Date(a.date).getTime() - new Date(b.date).getTime();
    return d !== 0 ? d : a.id - b.id;
  });
  let balance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  const rows = sorted.map((e) => {
    balance += e.amount;
    const debit = e.amount > 0 ? e.amount : 0;
    const credit = e.amount < 0 ? -e.amount : 0;
    totalDebit += debit;
    totalCredit += credit;
    return { ...e, debit, credit, balance };
  });
  return { rows, totalDebit, totalCredit, balance };
}

/** Urut nominal terbesar dulu; 0 / kosong / minus (lunas) ditaruh paling bawah. Stabil untuk nilai sama. */
export function sortByAmountDesc<T>(items: T[], amount: (t: T) => number | null | undefined): T[] {
  return items
    .map((t, i) => ({ t, i, v: amount(t) ?? 0 }))
    .sort((a, b) => {
      const za = a.v <= 0;
      const zb = b.v <= 0;
      if (za !== zb) return za ? 1 : -1;
      return b.v - a.v || a.i - b.i;
    })
    .map((x) => x.t);
}
