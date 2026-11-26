import { db } from "@/lib/db";
import { TABLE_ORDER, serializeBackup, type BackupFile, type Row, type TableName } from "@/lib/backup";
import { OWNED_FKS, delegateKey } from "@/lib/tenancy";

type Delegate = {
  findMany: (args?: unknown) => Promise<Row[]>;
  deleteMany: (args?: unknown) => Promise<unknown>;
  create: (args: { data: Row; select: { id: true } }) => Promise<{ id: number }>;
  createMany: (args: { data: Row[] }) => Promise<unknown>;
};

/** Nama model -> delegate Prisma (mis. "DebtPlan" -> db.debtPlan). */
function delegate(client: unknown, t: TableName): Delegate {
  return (client as Record<string, Delegate>)[delegateKey(t)];
}

/** Tabel yang id-nya dirujuk tabel lain: perlu dibuat satu per satu agar id barunya tercatat. */
const REFERENCED = new Set(Object.values(OWNED_FKS).flatMap((fks) => Object.values(fks)));

/** Backup data milik akun yang sedang login saja (db sudah terfilter per akun). */
export async function exportAll(): Promise<BackupFile> {
  const tables = {} as Record<TableName, Row[]>;
  for (const t of TABLE_ORDER) {
    const rows = await delegate(db, t).findMany(t === "AppSetting" ? undefined : { orderBy: { id: "asc" } });
    // userId tidak ikut: file backup bisa dipulihkan ke akun mana pun
    tables[t] = rows.map((r) => omit(r, "userId"));
  }
  return serializeBackup(tables);
}

/**
 * Ganti seluruh data akun yang sedang login dengan isi backup (satu transaksi: gagal = tidak ada
 * yang berubah). Data akun lain tidak tersentuh. Semua id dibuat baru lalu foreign key
 * dipetakan ulang, jadi file dari akun lain / versi lama tidak bentrok dengan id yang sudah ada.
 */
export async function restoreAll(tables: Record<TableName, Row[]>) {
  await db.$transaction(
    async (tx) => {
      await wipe(tx);

      const idMap = new Map<string, Map<number, number>>();
      for (const t of TABLE_ORDER) {
        const rows = (tables[t] ?? []).map((row) => remap(t, row, idMap));
        if (!rows.length) continue;
        if (t === "AppSetting") {
          await tx.appSetting.create({ data: rows[0] as never });
        } else if (REFERENCED.has(t)) {
          const m = new Map<number, number>();
          for (const { id, ...data } of rows) {
            const created = await delegate(tx, t).create({ data, select: { id: true } });
            m.set(id as number, created.id);
          }
          idMap.set(t, m);
        } else {
          await delegate(tx, t).createMany({ data: rows.map((r) => omit(r, "id")) });
        }
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  return Object.fromEntries(TABLE_ORDER.map((t) => [t, tables[t]?.length ?? 0]));
}

/** Hapus semua data akun aktif (anak dulu). */
async function wipe(client: unknown) {
  for (const t of [...TABLE_ORDER].reverse()) await delegate(client, t).deleteMany();
}

/** Hapus seluruh data keuangan akun aktif (dipakai saat admin menghapus akun). */
export async function deleteAllData() {
  await db.$transaction(async (tx) => wipe(tx), { timeout: 120_000, maxWait: 10_000 });
}

/** Buang userId (diisi otomatis) dan ganti foreign key lama dengan id baru. */
function remap(t: TableName, row: Row, idMap: Map<string, Map<number, number>>): Row {
  // format lama: AppSetting punya id = 1
  const out = t === "AppSetting" ? omit(row, "userId", "id") : omit(row, "userId");
  for (const [col, target] of Object.entries(OWNED_FKS[t] ?? {})) {
    const old = out[col];
    if (old === null || old === undefined) continue;
    const next = idMap.get(target)?.get(Number(old));
    if (next === undefined) throw new Error(`Backup tidak konsisten: ${t}.${col} merujuk ${target} #${old} yang tidak ada`);
    out[col] = next;
  }
  return out;
}

function omit(row: Row, ...keys: string[]): Row {
  const out = { ...row };
  for (const k of keys) delete out[k];
  return out;
}
