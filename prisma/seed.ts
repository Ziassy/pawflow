// Seed idempotent: aman dijalankan berulang (upsert berdasarkan nama unik).
import "dotenv/config";
import { db } from "../src/lib/db";

const CATEGORIES = [
  { name: "Kebutuhan", kind: "EXPENSE", targetBps: 4000, color: "#2563eb", sortOrder: 1 },
  { name: "Cicilan", kind: "EXPENSE", targetBps: 3000, color: "#dc2626", sortOrder: 2 },
  { name: "Masa Depan", kind: "EXPENSE", targetBps: 2000, color: "#16a34a", sortOrder: 3 },
  { name: "Kebaikan", kind: "EXPENSE", targetBps: 1000, color: "#d97706", sortOrder: 4 },
  { name: "Lainnya", kind: "EXPENSE", targetBps: 0, color: "#64748b", sortOrder: 5 },
  { name: "Pemasukan", kind: "INCOME", targetBps: 0, color: "#0d9488", sortOrder: 6 },
] as const;

// Nominal default dikosongkan: isi di Pengaturan > Template.
const TEMPLATES: { name: string; category: string }[] = [
  { name: "Kuota", category: "Kebutuhan" },
  { name: "Uang jajan", category: "Kebutuhan" },
  { name: "Cicilan", category: "Cicilan" },
  { name: "BPJS Kesehatan", category: "Kebutuhan" },
  { name: "BPJSTK", category: "Masa Depan" },
  { name: "Kontrol Behel", category: "Kebutuhan" },
  { name: "Mom", category: "Kebaikan" },
  { name: "Investasi", category: "Masa Depan" },
  { name: "Dana Darurat", category: "Masa Depan" },
  { name: "Kucing", category: "Kebutuhan" },
];

const ASSET_TYPES = [
  ["Emas", "#ca8a04"],
  ["Bitcoin", "#f97316"],
  ["Saham Indonesia", "#dc2626"],
  ["Deposito", "#7c3aed"],
  ["Dana Darurat", "#0891b2"],
  ["Tabungan Jarak Dekat", "#2563eb"],
  ["Reksadana Pasar Uang", "#16a34a"],
  ["Obligasi", "#9333ea"],
  ["USDC", "#0ea5e9"],
  ["Cash", "#64748b"],
  ["Bank", "#475569"],
] as const;

const PLATFORMS = ["Ajaib", "Tokocrypto", "Krom", "Superbank", "Permata", "BCA", "Emas fisik"];

async function main() {
  await db.appSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (const c of CATEGORIES) {
    // update: {} -> tidak menimpa target % yang sudah diubah di Pengaturan
    await db.category.upsert({ where: { name: c.name }, update: {}, create: { ...c } });
  }

  const cats = Object.fromEntries((await db.category.findMany()).map((c) => [c.name, c.id]));
  const existingTemplates = new Set((await db.recurringTemplate.findMany()).map((t) => t.name));
  for (const [i, t] of TEMPLATES.entries()) {
    if (existingTemplates.has(t.name)) continue;
    await db.recurringTemplate.create({
      data: { name: t.name, categoryId: cats[t.category], sortOrder: i + 1 },
    });
  }

  for (const [i, [name, color]] of ASSET_TYPES.entries()) {
    await db.assetType.upsert({ where: { name }, update: {}, create: { name, color, sortOrder: i + 1 } });
  }
  for (const [i, name] of PLATFORMS.entries()) {
    await db.platform.upsert({ where: { name }, update: {}, create: { name, sortOrder: i + 1 } });
  }

  console.log(
    `Seed selesai: ${CATEGORIES.length} kategori, ${TEMPLATES.length} template, ` +
      `${ASSET_TYPES.length} jenis aset, ${PLATFORMS.length} platform.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
