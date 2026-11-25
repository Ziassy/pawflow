// Format angka & bulan untuk UI (Bahasa Indonesia).

const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** 14200000 -> "Rp14.200.000"; -99170 -> "-Rp99.170"; null -> "–" */
export function formatRupiah(value: number | bigint | null | undefined): string {
  if (value === null || value === undefined) return "–";
  const n = typeof value === "bigint" ? value : BigInt(Math.round(value));
  const neg = n < 0n;
  const abs = (neg ? -n : n).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "-" : ""}Rp${grouped}`;
}

/** Ringkas untuk kalimat/grafik: 14200000 -> "Rp14,2jt"; 413000 -> "Rp413rb"; 1.5e9 -> "Rp1,5M" */
export function formatRupiahShort(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  const neg = value < 0;
  const a = Math.abs(value);
  const fmt = (x: number) =>
    x.toLocaleString("id-ID", { maximumFractionDigits: x < 10 ? 1 : x < 100 ? 1 : 0 });
  let s: string;
  if (a >= 1e9) s = `Rp${fmt(a / 1e9)}M`;
  else if (a >= 1e6) s = `Rp${fmt(a / 1e6)}jt`;
  else if (a >= 1e3) s = `Rp${fmt(a / 1e3)}rb`;
  else s = `Rp${a}`;
  return neg ? `-${s}` : s;
}

/** Basis poin -> "40%" / "7,5%" */
export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "–";
  return `${(bps / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

/** Rasio (0.1924) -> "19,24%"; null -> "–" */
export function formatPercent(ratio: number | null | undefined, digits = 2): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "–";
  return `${(ratio * 100).toLocaleString("id-ID", { maximumFractionDigits: digits })}%`;
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(s: string): boolean {
  return MONTH_RE.test(s);
}

/** "2026-10" -> "Okt 2026" */
export function formatMonth(key: string): string {
  const m = MONTH_RE.exec(key);
  if (!m) return key;
  return `${BULAN_PENDEK[Number(m[2]) - 1]} ${m[1]}`;
}

/** "2026-10" -> "Oktober 2026" */
export function formatMonthLong(key: string): string {
  const m = MONTH_RE.exec(key);
  if (!m) return key;
  return `${BULAN_PANJANG[Number(m[2]) - 1]} ${m[1]}`;
}

/** Date -> "2026-10" (zona waktu lokal) */
export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Tambah n bulan: addMonths("2026-12", 1) -> "2027-01" */
export function addMonths(key: string, n: number): string {
  const m = MONTH_RE.exec(key);
  if (!m) throw new Error(`Bulan tidak valid: ${key}`);
  const idx = Number(m[1]) * 12 + (Number(m[2]) - 1) + n;
  const y = Math.floor(idx / 12);
  const mo = idx - y * 12 + 1;
  return `${y}-${String(mo).padStart(2, "0")}`;
}

/** Jumlah bulan dari a ke b (b - a). */
export function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

export { BULAN_PENDEK };
