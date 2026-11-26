// Data awal untuk satu akun: kategori, template bulanan, jenis aset, platform, pengaturan.
// Idempotent (aman diulang). Dijalankan di scope akun aktif: lewat runAsUser() atau sesi login.
import { currentUserId, db } from "./db";

export const DEFAULT_CATEGORIES = [
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

/** Isi data awal akun aktif yang belum ada. Tidak menimpa yang sudah diubah pengguna. */
export async function seedUserDefaults() {
  const userId = await currentUserId();
  await db.appSetting.upsert({ where: { userId }, update: {}, create: { userId } });

  const existingCats = new Set((await db.category.findMany({ select: { name: true } })).map((c) => c.name));
  for (const c of DEFAULT_CATEGORIES) {
    // Kategori yang sudah ada tidak disentuh -> target % yang sudah diubah di Pengaturan tetap
    if (!existingCats.has(c.name)) await db.category.create({ data: { ...c } });
  }

  const cats = Object.fromEntries((await db.category.findMany()).map((c) => [c.name, c.id]));
  const existingTemplates = new Set((await db.recurringTemplate.findMany()).map((t) => t.name));
  for (const [i, t] of TEMPLATES.entries()) {
    if (existingTemplates.has(t.name) || !cats[t.category]) continue;
    await db.recurringTemplate.create({ data: { name: t.name, categoryId: cats[t.category], sortOrder: i + 1 } });
  }

  const existingTypes = new Set((await db.assetType.findMany({ select: { name: true } })).map((t) => t.name));
  for (const [i, [name, color]] of ASSET_TYPES.entries()) {
    if (!existingTypes.has(name)) await db.assetType.create({ data: { name, color, sortOrder: i + 1 } });
  }
  const existingPlatforms = new Set((await db.platform.findMany({ select: { name: true } })).map((p) => p.name));
  for (const [i, name] of PLATFORMS.entries()) {
    if (!existingPlatforms.has(name)) await db.platform.create({ data: { name, sortOrder: i + 1 } });
  }

  return { categories: DEFAULT_CATEGORIES.length, templates: TEMPLATES.length, assetTypes: ASSET_TYPES.length, platforms: PLATFORMS.length };
}
