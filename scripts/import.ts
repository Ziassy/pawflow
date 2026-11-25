// Import CSV dari spreadsheet lama ke database.
//
//   npm run import                # import dari ./data
//   npm run import -- --dry-run   # simulasi: tampilkan laporan, tidak menyimpan
//   npm run import -- --force     # timpa baris hasil import sebelumnya dengan isi CSV
//   npm run import -- --prune     # hapus baris hasil import yang sudah tidak ada di CSV
//   npm run import -- --dir path  # folder lain
//
// Idempotent: setiap baris punya kunci import. Menjalankan ulang tidak menggandakan data,
// dan (tanpa --force) tidak menimpa perubahan yang kamu buat di aplikasi.
// Transaksi yang kamu input manual tidak pernah disentuh.
// Logika ada di scripts/import-runner.ts.

import "dotenv/config";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { IMPORT_FILES, runImport, type Counter, type ImportFileKey } from "./import-runner";
import type { Issue } from "../src/lib/import/plan";
import { formatMonth, formatRupiah } from "../src/lib/format";

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const dirArg = args.indexOf("--dir");
const DIR = path.resolve(dirArg >= 0 ? args[dirArg + 1] : "data");
const DRY = flag("--dry-run");
const FORCE = flag("--force");
const PRUNE = flag("--prune");

async function main() {
  console.log(`Folder: ${DIR}${DRY ? "  (DRY RUN — tidak menyimpan)" : ""}${FORCE ? "  (--force)" : ""}${PRUNE ? "  (--prune)" : ""}\n`);

  const files: Partial<Record<ImportFileKey, string>> = {};
  for (const [k, f] of Object.entries(IMPORT_FILES) as [ImportFileKey, string][]) {
    const p = path.join(DIR, f);
    if (existsSync(p)) {
      files[k] = readFileSync(p, "utf8");
      console.log(`  ✓ ${f}`);
    } else console.log(`  – ${f} (tidak ada, dilewati)`);
  }
  const invFile = existsSync(DIR) ? readdirSync(DIR).find((n) => /investasi.*\.csv$/i.test(n)) : undefined;
  console.log(invFile ? `  ✓ ${invFile}` : "  – investasi*.csv (tidak ada, dilewati)");
  if (Object.keys(files).length === 0 && !invFile) {
    console.error(`\nTidak ada file CSV di ${DIR}.`);
    process.exit(1);
  }

  const r = await runImport(files, invFile ? readFileSync(path.join(DIR, invFile), "utf8") : null, { dryRun: DRY, force: FORCE, prune: PRUNE });

  const line = (label: string, c: Counter) =>
    console.log(
      `  ${label.padEnd(10)} baru ${String(c.created).padStart(5)}  diperbarui ${String(c.updated).padStart(4)}  ` +
        `sudah ada ${String(c.unchanged).padStart(5)}${c.deleted ? `  dihapus ${c.deleted}` : ""}`,
    );
  console.log(`\nHasil${DRY ? " (simulasi)" : ""}:`);
  line("Bulan", r.stats.bulan);
  line("Transaksi", r.stats.transaksi);
  line("Aset", r.stats.aset);
  line("Hutang", r.stats.hutang);
  if (r.investasi) {
    line("Investasi*", r.stats.investasi);
    const i = r.investasi;
    console.log(`  *sheet Investasi: ${i.investments} investasi, ${i.receivables} piutang, ${i.targets} target portofolio, ${i.physical} aset fisik, ${i.goals} target, ${i.resolutions} resolusi`);
  }
  if (r.created.assetTypes.length) console.log(`  Jenis aset baru: ${r.created.assetTypes.join(", ")}`);
  if (r.created.debts.length) console.log(`  Hutang baru: ${r.created.debts.join(", ")} (cek jenisnya di menu Hutang)`);

  const printIssues = (list: Issue[], title: string) => {
    if (!list.length) return;
    console.log(`\n${title} (${list.length}):`);
    for (const i of list) console.log(`  ${i.file}${i.line ? `:${i.line}` : ""}  ${i.message}`);
  };
  const errors = r.issues.filter((i) => i.level === "error");
  printIssues(errors, "✗ Baris gagal (tidak diimport)");
  printIssues(r.issues.filter((i) => i.level === "warning"), "! Peringatan");

  if (r.expectations) {
    const bad = new Set(r.mismatches.map((m) => m.month));
    console.log(`\nVerifikasi vs ringkasan_bulanan.csv: ${r.expectations - bad.size}/${r.expectations} bulan cocok.`);
    for (const m of r.mismatches) {
      console.log(
        `  ✗ ${formatMonth(m.month)} (baris ${m.line}) ${m.field}: CSV ${formatRupiah(m.expected)} ≠ hitung ${formatRupiah(m.actual)} ` +
          `(selisih ${formatRupiah(m.actual - m.expected)})`,
      );
    }
  }

  const ok = errors.length === 0 && r.mismatches.length === 0;
  console.log(ok ? "\n✓ Selesai tanpa masalah." : "\nSelesai dengan masalah. Perbaiki CSV lalu jalankan ulang (aman diulang).");
  process.exitCode = ok ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
