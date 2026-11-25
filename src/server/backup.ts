import { db, dbProvider } from "@/lib/db";
import { TABLE_ORDER, serializeBackup, type BackupFile, type Row, type TableName } from "@/lib/backup";

type Delegate = {
  findMany: (args?: unknown) => Promise<Row[]>;
  deleteMany: (args?: unknown) => Promise<unknown>;
  createMany: (args: { data: Row[] }) => Promise<unknown>;
};

/** Nama model -> delegate Prisma (mis. "DebtPlan" -> db.debtPlan). */
function delegate(client: unknown, t: TableName): Delegate {
  const key = t[0].toLowerCase() + t.slice(1);
  return (client as Record<string, Delegate>)[key];
}

/** Tabel dengan id autoincrement (sequence PostgreSQL perlu disetel ulang setelah restore). */
const SERIAL_TABLES = TABLE_ORDER.filter((t) => t !== "AppSetting" && t !== "AssetMonthNote");

export async function exportAll(): Promise<BackupFile> {
  const tables = {} as Record<TableName, Row[]>;
  for (const t of TABLE_ORDER) {
    tables[t] = await delegate(db, t).findMany(t === "AssetMonthNote" ? { orderBy: { month: "asc" } } : { orderBy: { id: "asc" } });
  }
  return serializeBackup(tables);
}

/** Ganti seluruh isi DB dengan isi backup (satu transaksi: gagal = tidak ada yang berubah). */
export async function restoreAll(tables: Record<TableName, Row[]>) {
  await db.$transaction(
    async (tx) => {
      for (const t of [...TABLE_ORDER].reverse()) await delegate(tx, t).deleteMany();
      for (const t of TABLE_ORDER) {
        const rows = tables[t];
        if (rows.length) await delegate(tx, t).createMany({ data: rows });
      }
      if (dbProvider === "postgresql") {
        for (const t of SERIAL_TABLES) {
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1), (SELECT MAX(id) IS NOT NULL FROM "${t}"))`,
          );
        }
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  return Object.fromEntries(TABLE_ORDER.map((t) => [t, tables[t].length]));
}
