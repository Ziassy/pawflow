// Parser sheet "Investasi" lama (beberapa tabel dalam satu sheet).
import { parseAmount, parseCsv } from "./parse";
import type { Issue } from "./plan";

export type InvestasiPlan = {
  updateDate: Date | null;
  month: string | null;
  investments: { line: number; platform: string | null; description: string | null; assetType: string; principal: number; currentValue: number | null }[];
  receivables: { line: number; name: string; principal: number; platform: string | null }[];
  targets: { line: number; label: string; assetType: string; amount: number }[];
  physical: { line: number; name: string; value: number }[];
  goals: { line: number; name: string; target: number; collected: number }[];
  resolutions: { line: number; text: string }[];
  issues: Issue[];
};

const FILE = "investasi.csv";

/** Nama jenis di sheet -> nama jenis aset di aplikasi. */
export const TYPE_ALIASES: Record<string, string> = {
  btc: "Bitcoin",
  bitcoin: "Bitcoin",
  "saham indonesia": "Saham Indonesia",
  emas: "Emas",
  currency: "USDC",
  usdc: "USDC",
  "tabungan jarak dekat": "Tabungan Jarak Dekat",
  "tabungan jarak dekat (cash)": "Tabungan Jarak Dekat",
  "dana darurat": "Dana Darurat",
  "emas dana darurat": "Dana Darurat",
  bank: "Bank",
  cash: "Cash",
  deposito: "Deposito",
  obligasi: "Obligasi",
  "obligasi/pendapatan tetap": "Obligasi",
  "reksadana pasar uang": "Reksadana Pasar Uang",
};

export const PLATFORM_ALIASES: Record<string, string> = {
  "emas fisik": "Emas fisik",
  "permata bank": "Permata",
  permata: "Permata",
  "bca bank": "BCA",
  bca: "BCA",
  krom: "Krom",
  ajaib: "Ajaib",
  superbank: "Superbank",
  tokocrypto: "Tokocrypto",
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
export const mapType = (s: string) => TYPE_ALIASES[norm(s)] ?? s.trim().replace(/\s*\(.*\)\s*$/, "");
export const mapPlatform = (s: string) => PLATFORM_ALIASES[norm(s)] ?? s.trim();

function parseUsDate(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  return m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
}

export function planInvestasi(text: string): InvestasiPlan {
  const rows = parseCsv(text);
  const issues: Issue[] = [];
  const out: InvestasiPlan = { updateDate: null, month: null, investments: [], receivables: [], targets: [], physical: [], goals: [], resolutions: [], issues };
  const cell = (r: number, c: number) => (rows[r]?.[c] ?? "").trim();
  const amt = (r: number, c: number) => {
    const a = parseAmount(cell(r, c));
    return "value" in a ? a.value : null;
  };

  // Tanggal update
  for (let r = 0; r < rows.length; r++) {
    const c = rows[r].findIndex((x) => /update date/i.test(x));
    if (c >= 0) {
      const v = rows[r].slice(c + 1).find((x) => x.trim());
      out.updateDate = v ? parseUsDate(v) : null;
      break;
    }
  }
  if (out.updateDate) {
    out.month = `${out.updateDate.getFullYear()}-${String(out.updateDate.getMonth() + 1).padStart(2, "0")}`;
  } else issues.push({ file: FILE, line: 0, level: "warning", message: "Update Date tidak ditemukan; target & resolusi tidak bertanggal" });

  // Tabel utama
  const h = rows.findIndex((r) => r.some((x) => /^platform$/i.test(x.trim())) && r.some((x) => /jenis investasi/i.test(x)));
  if (h < 0) {
    issues.push({ file: FILE, line: 1, level: "error", message: "Header Platform / Jenis Investasi tidak ditemukan" });
    return out;
  }
  const head = rows[h].map((x) => x.trim().toLowerCase());
  const cP = head.indexOf("platform");
  const cT = head.indexOf("type");
  const cJ = head.findIndex((x) => x.includes("jenis investasi"));
  const cA = head.findIndex((x) => x.includes("harga awal"));
  const cZ = head.findIndex((x) => x === "akhir");
  const cTarget = head.findIndex((x) => x.includes("target portofolio"));

  for (let r = h + 1; r < rows.length; r++) {
    const line = r + 1;
    const platform = cell(r, cP);
    const type = cell(r, cT);
    const jenis = cell(r, cJ);
    const awal = amt(r, cA);
    if (awal === null || (!platform && !type && !jenis)) continue;
    if (!jenis) {
      out.receivables.push({ line, name: type || platform, principal: awal, platform: platform ? mapPlatform(platform) : null });
      continue;
    }
    out.investments.push({
      line,
      platform: platform ? mapPlatform(platform) : null,
      description: type || null,
      assetType: mapType(jenis),
      principal: awal,
      currentValue: amt(r, cZ),
    });
  }

  // Target portofolio (di kanan header)
  if (cTarget >= 0) {
    for (let r = h + 1; r < rows.length; r++) {
      const label = cell(r, cTarget);
      if (!label) break;
      const v = amt(r, cTarget + 1);
      if (v === null) continue;
      out.targets.push({ line: r + 1, label, assetType: mapType(label), amount: v });
    }
  }

  // Blok bertitel: cari judul di sel mana pun, baca baris di bawahnya sampai label kosong
  const block = (title: RegExp, fn: (r: number, c: number) => boolean | void) => {
    for (let r = 0; r < rows.length; r++) {
      const c = rows[r].findIndex((x) => title.test(x.trim()));
      if (c < 0) continue;
      let started = false;
      for (let k = r + 1; k < rows.length; k++) {
        if (!cell(k, c)) {
          // Lewati baris kosong tepat di bawah judul; berhenti di baris kosong setelah data
          if (started || k - r > 3) break;
          continue;
        }
        started = true;
        if (fn(k, c) === false) break;
      }
      return;
    }
  };
  block(/^nama asset$/i, (r, c) => {
    const v = amt(r, c + 1);
    if (v !== null) out.physical.push({ line: r + 1, name: cell(r, c), value: v });
  });
  block(/^tangga ternak uang$/i, (r, c) => {
    const target = amt(r, c + 1);
    if (target === null) return;
    out.goals.push({ line: r + 1, name: cell(r, c), target, collected: amt(r, c + 2) ?? 0 });
  });
  block(/^goals$/i, (r, c) => {
    out.resolutions.push({ line: r + 1, text: cell(r, c).replace(/^\d+\.\s*/, "") });
  });

  return out;
}
