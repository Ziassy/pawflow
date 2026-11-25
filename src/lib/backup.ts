// Format backup JSON (murni, tanpa DB). Satu file berisi semua tabel.
import { z } from "zod";

export const BACKUP_APP = "catatan-keuangan";
export const BACKUP_VERSION = 1;

/**
 * Urutan tabel untuk INSERT (induk dulu). Hapus memakai urutan terbalik.
 * Nama = nama model Prisma.
 */
export const TABLE_ORDER = [
  "AppSetting",
  "Category",
  "Platform",
  "AssetType",
  "MonthlyPeriod",
  // Debt sebelum RecurringTemplate: template bisa merujuk hutang (debtId)
  "Debt",
  "RecurringTemplate",
  "DebtSnapshot",
  "DebtPlan",
  "DebtEntry",
  "Receivable",
  "ReceivableInstallment",
  "ReceivableEntry",
  "Investment",
  "AssetSnapshot",
  "AssetMonthNote",
  "PortfolioTarget",
  "PhysicalAsset",
  "Goal",
  "Resolution",
  "Transaction",
] as const;
export type TableName = (typeof TABLE_ORDER)[number];

/** Kolom BigInt (disimpan sebagai string di JSON). */
const BIGINT_FIELDS: Partial<Record<TableName, string[]>> = { Goal: ["targetAmount", "manualCollected"] };
/** Kolom tanggal (string ISO di JSON). */
const DATE_FIELDS: Partial<Record<TableName, string[]>> = {
  AppSetting: ["birthDate", "updatedAt"],
  MonthlyPeriod: ["createdAt", "updatedAt"],
  Transaction: ["createdAt", "updatedAt"],
  DebtEntry: ["date"],
  Receivable: ["createdAt"],
  ReceivableInstallment: ["paidAt"],
  ReceivableEntry: ["date"],
  Investment: ["valueUpdatedAt"],
};

export type Row = Record<string, unknown>;
export type BackupFile = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  tables: Record<TableName, Row[]>;
};

/** Data DB -> objek siap JSON.stringify (BigInt -> string, Date -> ISO). */
export function serializeBackup(tables: Record<TableName, Row[]>, now = new Date()): BackupFile {
  const out = {} as Record<TableName, Row[]>;
  const counts: Record<string, number> = {};
  for (const t of TABLE_ORDER) {
    out[t] = (tables[t] ?? []).map((r) => {
      const row: Row = {};
      for (const [k, v] of Object.entries(r)) {
        row[k] = typeof v === "bigint" ? v.toString() : v instanceof Date ? v.toISOString() : v;
      }
      return row;
    });
    counts[t] = out[t].length;
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), counts, tables: out };
}

const zFile = z.object({
  app: z.literal(BACKUP_APP, { error: "Bukan file backup aplikasi ini" }),
  version: z.number().int(),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

/** Teks JSON -> data siap insert (string -> BigInt/Date). Lempar Error yang jelas jika tidak valid. */
export function parseBackup(text: string): { exportedAt: string; tables: Record<TableName, Row[]> } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("File bukan JSON yang valid");
  }
  const r = zFile.safeParse(json);
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Format backup tidak dikenali");
  if (r.data.version > BACKUP_VERSION) throw new Error(`Versi backup ${r.data.version} lebih baru dari aplikasi ini`);
  const unknown = Object.keys(r.data.tables).filter((t) => !(TABLE_ORDER as readonly string[]).includes(t));
  if (unknown.length) throw new Error(`Tabel tidak dikenal: ${unknown.join(", ")}`);
  if (!r.data.tables.Category?.length) throw new Error("Backup tidak berisi kategori");

  const tables = {} as Record<TableName, Row[]>;
  for (const t of TABLE_ORDER) {
    const big = BIGINT_FIELDS[t] ?? [];
    const dates = DATE_FIELDS[t] ?? [];
    tables[t] = (r.data.tables[t] ?? []).map((row) => {
      const out: Row = { ...row };
      for (const f of big) if (out[f] !== null && out[f] !== undefined) out[f] = BigInt(out[f] as string);
      for (const f of dates) if (typeof out[f] === "string") out[f] = new Date(out[f] as string);
      return out;
    });
  }
  return { exportedAt: r.data.exportedAt, tables };
}
