// Parser untuk CSV export Google Spreadsheet lama.

/** Parse CSV (RFC 4180): kutip ganda, koma/baris baru dalam kutip, BOM, CRLF. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export type AmountResult = { value: number | null } | { error: string };

/**
 * Nominal dari spreadsheet -> integer Rupiah.
 * "14,200,000" | "14,200,000.00" | "14.200.000" | "Rp14.200.000" -> 14200000
 * "(99,170)" -> -99170 ; "-" -> 0 ; "" -> null (kosong) ; "#DIV/0!" -> null
 */
export function parseAmount(raw: string | undefined): AmountResult {
  let s = (raw ?? "").trim();
  if (s === "") return { value: null };
  if (/^#(DIV\/0!|N\/A|VALUE!|REF!|NAME\?|NUM!|ERROR!)$/i.test(s)) return { value: null };
  if (/^[-–—]$/.test(s)) return { value: 0 };

  let neg = false;
  const paren = /^\((.*)\)$/.exec(s);
  if (paren) {
    neg = true;
    s = paren[1].trim();
  }
  if (s.startsWith("-")) {
    neg = !neg;
    s = s.slice(1).trim();
  }
  s = s.replace(/^rp\.?\s*/i, "").replace(/\s/g, "");
  if (s.startsWith("-")) {
    neg = !neg;
    s = s.slice(1);
  }

  let n: number;
  if (/^\d+$/.test(s)) n = Number(s);
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) n = Number(s.replace(/,/g, "")); // 14,200,000.00
  else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) n = Number(s.replace(/\./g, "").replace(",", ".")); // 14.200.000,00
  else if (/^\d+\.\d{1,2}$/.test(s)) n = Number(s); // 15000.00
  else if (/^\d+,\d{1,2}$/.test(s)) n = Number(s.replace(",", ".")); // 15000,00
  else return { error: `Nominal tidak dikenali: "${raw}"` };

  const v = Math.round(n);
  return { value: neg && v !== 0 ? -v : v };
}

const MONTHS: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2, peb: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, ags: 8, agt: 8, agust: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, nop: 11, november: 11, nopember: 11,
  des: 12, dec: 12, desember: 12, december: 12,
};

function key(y: number, m: number): string | null {
  if (m < 1 || m > 12 || y < 1990 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Bulan dalam berbagai format -> "YYYY-MM".
 * "2026-10" | "2026/10" | "10/2026" | "Okt 2026" | "Oktober 2026" | "Oct-26" | "Jul 2022" | "10/1/2026"
 */
export function parseMonth(raw: string | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/.exec(s))) return key(+m[1], +m[2]);
  if ((m = /^(\d{1,2})[-/.](\d{4})$/.exec(s))) return key(+m[2], +m[1]);
  // m/d/yyyy (format tanggal Google Sheets en-US)
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return key(+m[3], +m[1]);
  if ((m = /^([a-z]+)\.?[ \-/']*(\d{4}|\d{2})$/.exec(s))) {
    const mo = MONTHS[m[1]];
    if (!mo) return null;
    const y = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    return key(y, mo);
  }
  return null;
}

/** Normalisasi header kolom untuk dicocokkan: huruf kecil, tanpa tanda baca. */
export function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Cari indeks kolom berdasarkan beberapa alias header. */
export function findColumn(header: string[], aliases: string[]): number {
  const normed = header.map(normHeader);
  for (const a of aliases) {
    const i = normed.indexOf(normHeader(a));
    if (i >= 0) return i;
  }
  return -1;
}

export function isBlankRow(row: string[]): boolean {
  return row.every((c) => c.trim() === "");
}
