// Ubah isi CSV menjadi rencana import (tanpa DB). Semua masalah dicatat per baris.

import { findColumn, isBlankRow, normHeader, parseAmount, parseCsv, parseMonth } from "./parse";

export type Issue = { file: string; line: number; level: "error" | "warning"; message: string };

export type TxPlan = {
  importKey: string;
  month: string;
  name: string;
  category: string;
  amount: number | null;
  isPaid: boolean;
  note: string | null;
};

export type PeriodPlan = { month: string; salary: number | null; isPlan: boolean };

/** Angka ringkasan dari spreadsheet, untuk verifikasi setelah import. */
export type Expectation = {
  month: string;
  line: number;
  salary: number | null;
  income: number | null;
  byCategory: Record<string, number | null>;
  totalExpense: number | null;
  sisa: number | null;
};

export type GridCell = { file: string; line: number; label: string; month: string; value: number };

export type ImportPlan = {
  periods: PeriodPlan[];
  transactions: TxPlan[];
  expectations: Expectation[];
  assets: GridCell[];
  debts: GridCell[];
  issues: Issue[];
};

export const INCOME = "Pemasukan";
export const SUMMARY_FALLBACK_CATEGORY = "Lainnya";

type Ctx = { categories: string[]; issues: Issue[] };

function issue(ctx: Ctx, file: string, line: number, message: string, level: Issue["level"] = "error") {
  ctx.issues.push({ file, line, level, message });
}

/** Cocokkan nama kategori (abaikan besar-kecil & spasi). */
export function resolveCategory(raw: string, categories: string[]): string | null {
  const n = normHeader(raw).replace(/\s/g, "");
  if (!n) return null;
  return categories.find((c) => normHeader(c).replace(/\s/g, "") === n) ?? null;
}

/** Baris header = baris pertama yang memuat kolom wajib. */
function locateHeader(rows: string[][], must: string[]): number {
  return rows.findIndex((r) => must.every((m) => findColumn(r, [m]) >= 0));
}

const PAID_VALUES = new Set(["tercatat", "lunas", "sudah", "ya", "y", "true", "dibayar", "sudah dibayar", "done", "x", "✓"]);
const UNPAID_VALUES = new Set(["", "rencana", "belum", "tidak", "false", "plan", "belum dibayar"]);

// ---------------------------------------------------------------------------
// transaksi.csv: Bulan, Nama, Kategori, Jumlah (Rp), Status, Koreksi
// ---------------------------------------------------------------------------
export function planTransaksi(text: string, ctx: Ctx, file = "transaksi.csv") {
  const rows = parseCsv(text);
  const h = locateHeader(rows, ["Bulan", "Nama", "Kategori"]);
  const txs: TxPlan[] = [];
  if (h < 0) {
    issue(ctx, file, 1, "Header tidak ditemukan (butuh kolom Bulan, Nama, Kategori, Jumlah)");
    return txs;
  }
  const head = rows[h];
  const col = {
    month: findColumn(head, ["Bulan"]),
    name: findColumn(head, ["Nama"]),
    cat: findColumn(head, ["Kategori"]),
    amount: findColumn(head, ["Jumlah", "Nominal", "Jumlah Rp"]),
    status: findColumn(head, ["Status", "Sudah dibayar"]),
    note: findColumn(head, ["Koreksi", "Catatan"]),
  };
  if (col.amount < 0) issue(ctx, file, h + 1, "Kolom Jumlah tidak ditemukan");

  const seen = new Map<string, number>();
  let lastMonth: string | null = null;
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    if (isBlankRow(r)) continue;
    const name = (r[col.name] ?? "").trim();
    const rawMonth = (r[col.month] ?? "").trim();
    // Sel bulan kosong = ikut bulan baris sebelumnya (gaya spreadsheet)
    const month: string | null = rawMonth ? parseMonth(rawMonth) : lastMonth;
    if (!name) {
      if (/^(total|jumlah|sub ?total)/i.test(rawMonth) || /total/i.test(r.join(" "))) continue;
      issue(ctx, file, line, "Nama kosong");
      continue;
    }
    if (/^(total|jumlah|subtotal)$/i.test(name)) continue;
    if (!month) {
      issue(ctx, file, line, `Bulan tidak valid: "${rawMonth}"`);
      continue;
    }
    lastMonth = month;
    const category = resolveCategory(r[col.cat] ?? "", ctx.categories);
    if (!category) {
      issue(ctx, file, line, `Kategori wajib & harus salah satu dari ${ctx.categories.join(", ")}: "${r[col.cat] ?? ""}"`);
      continue;
    }
    const amt = parseAmount(col.amount >= 0 ? r[col.amount] : "");
    if ("error" in amt) {
      issue(ctx, file, line, amt.error);
      continue;
    }
    if (amt.value !== null && amt.value < 0) {
      issue(ctx, file, line, `Nominal negatif ${amt.value} disimpan sebagai koreksi`, "warning");
    }
    const rawStatus = col.status >= 0 ? (r[col.status] ?? "").trim().toLowerCase() : "";
    let isPaid = PAID_VALUES.has(rawStatus);
    if (!isPaid && !UNPAID_VALUES.has(rawStatus)) {
      issue(ctx, file, line, `Status "${r[col.status]}" tidak dikenal, dianggap belum dibayar`, "warning");
      isPaid = false;
    }
    const note = col.note >= 0 ? (r[col.note] ?? "").trim() || null : null;

    // Kunci idempotent: bulan + nama + nominal + kategori + urutan kemunculan
    const base = `tx:${month}:${name.toLowerCase().replace(/\s+/g, " ")}:${amt.value ?? "null"}:${category}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    txs.push({ importKey: `${base}:${n}`, month, name, category, amount: amt.value, isPaid, note });
  }
  return txs;
}

// ---------------------------------------------------------------------------
// ringkasan_bulanan.csv: Bulan, Status, Gaji, Pemasukan, Kebutuhan, ..., Total, Sisa
// ---------------------------------------------------------------------------
export function planRingkasan(text: string, ctx: Ctx, file = "ringkasan_bulanan.csv") {
  const rows = parseCsv(text);
  const h = locateHeader(rows, ["Bulan", "Gaji"]);
  const out: { period: PeriodPlan; expectation: Expectation }[] = [];
  if (h < 0) {
    issue(ctx, file, 1, "Header tidak ditemukan (butuh kolom Bulan, Gaji)");
    return out;
  }
  const head = rows[h];
  const col = {
    month: findColumn(head, ["Bulan"]),
    status: findColumn(head, ["Status"]),
    salary: findColumn(head, ["Gaji", "Penghasilan"]),
    total: findColumn(head, ["Total keluar", "Total pengeluaran", "Total"]),
    sisa: findColumn(head, ["Sisa", "Sisa gaji"]),
  };
  const catCols = ctx.categories.map((c) => ({ c, i: findColumn(head, [c]) })).filter((x) => x.i >= 0);
  const seenMonths = new Set<string>();

  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    if (isBlankRow(r)) continue;
    const rawMonth = (r[col.month] ?? "").trim();
    if (/rata|total|jumlah|average/i.test(rawMonth)) continue;
    const month = parseMonth(rawMonth);
    if (!month) {
      issue(ctx, file, line, `Bulan tidak valid: "${rawMonth}"`);
      continue;
    }
    // Aturan 3: satu bulan satu sumber
    if (seenMonths.has(month)) {
      issue(ctx, file, line, `Bulan ${month} muncul dua kali; baris ini dilewati`);
      continue;
    }
    seenMonths.add(month);

    const num = (idx: number, label: string): number | null | undefined => {
      if (idx < 0) return undefined;
      const a = parseAmount(r[idx]);
      if ("error" in a) {
        issue(ctx, file, line, `${label}: ${a.error}`);
        return undefined;
      }
      return a.value;
    };
    const salary = num(col.salary, "Gaji");
    const byCategory: Record<string, number | null> = {};
    for (const { c, i: idx } of catCols) {
      const v = num(idx, c);
      if (v !== undefined) byCategory[c] = v;
    }
    const status = (r[col.status] ?? "").trim().toLowerCase();
    out.push({
      period: { month, salary: salary ?? null, isPlan: status === "rencana" },
      expectation: {
        month,
        line,
        salary: salary ?? null,
        income: byCategory[INCOME] ?? null,
        byCategory,
        totalExpense: num(col.total, "Total") ?? null,
        sisa: num(col.sisa, "Sisa") ?? null,
      },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// riwayat_gaji.csv: Bulan, Gaji, Pengeluaran tercatat
// ---------------------------------------------------------------------------
export function planRiwayatGaji(text: string, ctx: Ctx, file = "riwayat_gaji.csv") {
  const rows = parseCsv(text);
  const h = locateHeader(rows, ["Bulan", "Gaji"]);
  const out: { month: string; line: number; salary: number | null; expense: number | null }[] = [];
  if (h < 0) {
    issue(ctx, file, 1, "Header tidak ditemukan (butuh kolom Bulan, Gaji)");
    return out;
  }
  const head = rows[h];
  const cMonth = findColumn(head, ["Bulan"]);
  const cSalary = findColumn(head, ["Gaji"]);
  const cExp = findColumn(head, ["Pengeluaran tercatat", "Pengeluaran"]);
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    if (isBlankRow(r)) continue;
    const month = parseMonth(r[cMonth]);
    if (!month) {
      if (!/rata|total/i.test(r[cMonth] ?? "")) issue(ctx, file, line, `Bulan tidak valid: "${r[cMonth]}"`);
      continue;
    }
    const s = parseAmount(r[cSalary]);
    const e = cExp >= 0 ? parseAmount(r[cExp]) : { value: null };
    if ("error" in s || "error" in e) {
      issue(ctx, file, line, ("error" in s ? s.error : "") + ("error" in e ? e.error : ""));
      continue;
    }
    out.push({ month, line, salary: s.value, expense: e.value });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Grid: baris = label (jenis aset / kartu), kolom = bulan
// ---------------------------------------------------------------------------
export function planGrid(text: string, ctx: Ctx, file: string): GridCell[] {
  const rows = parseCsv(text);
  // Header = baris dengan paling banyak sel bulan
  let h = -1;
  let best = 0;
  rows.forEach((r, i) => {
    const n = r.filter((c) => parseMonth(c)).length;
    if (n > best) {
      best = n;
      h = i;
    }
  });
  if (h < 0) {
    issue(ctx, file, 1, "Tidak ada header bulan (mis. Jan 2026, Feb 2026, ...)");
    return [];
  }
  const months = rows[h].map((c) => parseMonth(c));
  const labelCol = months.findIndex((m) => m === null);
  const cells: GridCell[] = [];
  const seenLabels = new Set<string>();
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    if (isBlankRow(r)) continue;
    const label = (r[labelCol < 0 ? 0 : labelCol] ?? "").trim();
    if (!label) {
      if (r.some((c, j) => months[j] && c.trim())) issue(ctx, file, line, "Label baris kosong; baris dilewati", "warning");
      continue;
    }
    // Total dihitung aplikasi, jangan diimport
    if (/^(total|jumlah|sub ?total|grand total|selisih|kenaikan|persentase|%)/i.test(label)) continue;
    const lk = label.toLowerCase();
    if (seenLabels.has(lk)) {
      issue(ctx, file, line, `Label "${label}" muncul dua kali; baris dilewati`);
      continue;
    }
    seenLabels.add(lk);
    months.forEach((month, j) => {
      if (!month) return;
      const raw = r[j] ?? "";
      const a = parseAmount(raw);
      if ("error" in a) {
        issue(ctx, file, line, `${label} ${month}: ${a.error}`);
        return;
      }
      // Sel kosong = tidak ada data (bukan 0)
      if (a.value === null) return;
      cells.push({ file, line, label, month, value: a.value });
    });
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Gabungkan semua file
// ---------------------------------------------------------------------------
export function buildImportPlan(
  files: Partial<Record<"transaksi" | "ringkasan" | "riwayatGaji" | "assetTracker" | "hutang", string>>,
  categories: string[],
): ImportPlan {
  const ctx: Ctx = { categories, issues: [] };
  const periods = new Map<string, PeriodPlan>();
  const transactions: TxPlan[] = [];
  const expectations: Expectation[] = [];

  const ringkasan = files.ringkasan ? planRingkasan(files.ringkasan, ctx) : [];
  for (const { period, expectation } of ringkasan) {
    periods.set(period.month, period);
    expectations.push(expectation);
  }

  const details = files.transaksi ? planTransaksi(files.transaksi, ctx) : [];
  transactions.push(...details);
  const monthsWithDetail = new Set(details.map((t) => t.month));
  for (const m of monthsWithDetail) {
    if (!periods.has(m)) {
      const txs = details.filter((t) => t.month === m);
      // Tanpa ringkasan: bulan Rencana jika semua belum dibayar
      periods.set(m, { month: m, salary: null, isPlan: txs.every((t) => !t.isPaid) });
      ctx.issues.push({
        file: "transaksi.csv",
        level: "warning",
        line: 0,
        message: `${m} tidak ada di ringkasan_bulanan.csv; gaji kosong (status: Tidak lengkap)`,
      });
    }
  }

  // Bulan ringkasan tanpa rincian -> satu transaksi ringkasan per kategori
  for (const e of expectations) {
    if (monthsWithDetail.has(e.month)) continue;
    if (e.month >= "2026-01") {
      ctx.issues.push({
        file: "ringkasan_bulanan.csv",
        line: e.line,
        level: "warning",
        message: `${e.month} tidak punya rincian di transaksi.csv; dibuat transaksi ringkasan per kategori`,
      });
    }
    for (const [cat, amount] of Object.entries(e.byCategory)) {
      if (amount === null || amount === 0) continue;
      transactions.push({
        importKey: `sum:${e.month}:${cat}`,
        month: e.month,
        name: cat === INCOME ? "Pemasukan (ringkasan)" : `Ringkasan ${cat}`,
        category: cat,
        amount,
        isPaid: !periods.get(e.month)?.isPlan,
        note: "Import ringkasan_bulanan.csv (tanpa rincian)",
      });
    }
  }

  // Riwayat gaji: isi bulan yang belum ada; bandingkan jika sudah ada
  const riwayat = files.riwayatGaji ? planRiwayatGaji(files.riwayatGaji, ctx) : [];
  for (const g of riwayat) {
    const existing = periods.get(g.month);
    if (existing) {
      if (existing.salary === null) existing.salary = g.salary;
      else if (g.salary !== null && existing.salary !== g.salary) {
        ctx.issues.push({
          file: "riwayat_gaji.csv",
          line: g.line,
          level: "warning",
          message: `Gaji ${g.month} beda dengan ringkasan (${g.salary} vs ${existing.salary}); dipakai nilai ringkasan`,
        });
      }
      continue;
    }
    periods.set(g.month, { month: g.month, salary: g.salary, isPlan: false });
    if (g.expense !== null && g.expense !== 0 && !monthsWithDetail.has(g.month)) {
      transactions.push({
        importKey: `rg:${g.month}`,
        month: g.month,
        name: "Pengeluaran tercatat (riwayat gaji)",
        category: SUMMARY_FALLBACK_CATEGORY,
        amount: g.expense,
        isPaid: true,
        note: "Import riwayat_gaji.csv (tanpa rincian kategori)",
      });
    }
  }

  const assets = files.assetTracker ? planGrid(files.assetTracker, ctx, "asset_tracker.csv") : [];
  const debts = files.hutang ? planGrid(files.hutang, ctx, "hutang.csv") : [];

  return {
    periods: [...periods.values()].sort((a, b) => a.month.localeCompare(b.month)),
    transactions,
    expectations,
    assets,
    debts,
    issues: ctx.issues,
  };
}
