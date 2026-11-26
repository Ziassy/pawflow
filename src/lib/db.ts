// Client Prisma untuk data keuangan, otomatis dibatasi ke akun yang sedang login.
//
// Setiap query ke model milik akun (semua model kecuali User & LoginThrottle):
// - baca/ubah/hapus: `where.userId = <akun>` ditambahkan, jadi data akun lain tidak
//   pernah terbaca atau tersentuh walau id-nya ditebak;
// - buat: `data.userId = <akun>` diisi (termasuk nested create yang diizinkan);
// - kolom foreign key (categoryId, debtId, ...) dicek: baris tujuan harus milik akun yang sama;
// - akun yang masa langganannya berakhir hanya bisa membaca: semua operasi tulis ditolak.
//
// Akun diambil dari cookie sesi (getSessionUser). Skrip CLI/seed memakai runAsUser().
// Login & kelola akun memakai baseDb dari "./db-base" (tanpa penyaringan).
import { AsyncLocalStorage } from "node:async_hooks";
import { baseDb, dbProvider } from "./db-base";
import { getSessionUser } from "./session-user";
import { NESTED_CREATES, OWNED_FKS, UNSCOPED_MODELS, delegateKey } from "./tenancy";

export { dbProvider };

type Obj = Record<string, unknown>;

const userStore = new AsyncLocalStorage<number>();
type Scope = { userId: number; readOnly: boolean };
const txStore = new AsyncLocalStorage<{ tx: unknown; scope: Scope }>();

/** Pesan untuk akun yang langganannya berakhir (tampil di toast). */
export const READ_ONLY_MESSAGE = "Masa langganan berakhir. Data hanya bisa dilihat; hubungi admin untuk memperpanjang.";

/** Jalankan fn sebagai akun tertentu (skrip CLI, seed, akun baru dari admin). */
export function runAsUser<T>(userId: number, fn: () => PromiseLike<T>): Promise<T> {
  // await DI DALAM scope: query Prisma bersifat lazy (baru jalan saat di-then), jadi
  // mengembalikan PrismaPromise mentah akan mengeksekusinya di luar scope akun.
  return userStore.run(userId, async () => await fn());
}

/**
 * Akun aktif: runAsUser > transaksi berjalan > cookie sesi.
 * runAsUser = konteks sistem (skrip, admin membuat/menghapus akun): tidak pernah read-only.
 */
async function currentScope(): Promise<Scope> {
  const forced = userStore.getStore();
  if (forced !== undefined) return { userId: forced, readOnly: false };
  const inTx = txStore.getStore();
  if (inTx) return inTx.scope;
  const u = await getSessionUser();
  if (!u) throw new Error("Tidak terautentikasi");
  return { userId: u.id, readOnly: u.readOnly };
}

export async function currentUserId(): Promise<number> {
  return (await currentScope()).userId;
}

const WHERE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
]);
const WRITE_OPS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);
const RELATION_WRITE_KEYS = ["connect", "connectOrCreate", "disconnect", "set"];

const isPlainObject = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date) && Object.getPrototypeOf(v) === Object.prototype;

/** Kumpulan id foreign key yang harus dicek: model tujuan -> id. */
type Refs = Map<string, Set<number>>;

/**
 * Siapkan satu objek data tulis: buang userId kiriman pemanggil, isi userId akun (create),
 * kumpulkan foreign key, dan proses nested create yang diizinkan.
 */
function prepareData(model: string, data: unknown, userId: number, refs: Refs, mode: "create" | "update"): Obj {
  if (!isPlainObject(data)) throw new Error(`Data tulis ${model} tidak valid`);
  const out: Obj = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "userId") continue;
    const fkTarget = OWNED_FKS[model]?.[k];
    if (fkTarget) {
      if (typeof v === "number") (refs.get(fkTarget) ?? refs.set(fkTarget, new Set()).get(fkTarget)!).add(v);
      else if (v !== null && v !== undefined) throw new Error(`Kolom ${model}.${k} harus berupa id`);
      out[k] = v;
      continue;
    }
    const child = NESTED_CREATES[model]?.[k];
    if (child && isPlainObject(v)) {
      const nested: Obj = {};
      for (const [op, payload] of Object.entries(v)) {
        if (op === "create") {
          nested.create = Array.isArray(payload)
            ? payload.map((d) => prepareData(child, d, userId, refs, "create"))
            : prepareData(child, payload, userId, refs, "create");
        } else if (op === "createMany" && isPlainObject(payload) && Array.isArray(payload.data)) {
          nested.createMany = { ...payload, data: payload.data.map((d) => prepareData(child, d, userId, refs, "create")) };
        } else {
          throw new Error(`Operasi relasi ${model}.${k}.${op} tidak didukung`);
        }
      }
      out[k] = nested;
      continue;
    }
    if (isPlainObject(v) && RELATION_WRITE_KEYS.some((r) => r in v)) {
      throw new Error(`Tulis relasi ${model}.${k} tidak didukung: pakai kolom id`);
    }
    out[k] = v;
  }
  if (mode === "create") out.userId = userId;
  return out;
}

const scoped = baseDb.$extends({
  name: "user-scope",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if ((UNSCOPED_MODELS as readonly string[]).includes(model)) return query(args);
        const { userId, readOnly } = await currentScope();
        if (readOnly && WRITE_OPS.has(operation)) throw new Error(READ_ONLY_MESSAGE);
        const a: Obj = { ...((args ?? {}) as Obj) };
        const refs: Refs = new Map();

        if (WHERE_OPS.has(operation)) a.where = { ...((a.where as Obj) ?? {}), userId };

        switch (operation) {
          case "create":
            a.data = prepareData(model, a.data, userId, refs, "create");
            break;
          case "createMany":
          case "createManyAndReturn":
            a.data = (Array.isArray(a.data) ? a.data : [a.data]).map((d) => prepareData(model, d, userId, refs, "create"));
            break;
          case "update":
          case "updateMany":
          case "updateManyAndReturn":
            a.data = prepareData(model, a.data, userId, refs, "update");
            break;
          case "upsert":
            a.create = prepareData(model, a.create, userId, refs, "create");
            a.update = prepareData(model, a.update, userId, refs, "update");
            break;
        }

        if (refs.size) await assertOwned(refs);
        return query(a as typeof args);
      },
    },
  },
});

/** Semua id foreign key harus ada DAN milik akun aktif (count lewat client terfilter). */
async function assertOwned(refs: Refs) {
  const client = (txStore.getStore()?.tx ?? scoped) as unknown as Record<string, { count: (a: unknown) => Promise<number> }>;
  for (const [target, ids] of refs) {
    const list = [...ids];
    const n = await client[delegateKey(target)].count({ where: { id: { in: list } } });
    if (n !== list.length) throw new Error("Data terkait tidak ditemukan. Muat ulang halaman lalu coba lagi.");
  }
}

type ScopedClient = typeof scoped;
/** Client di dalam db.$transaction(async (tx) => ...). */
export type DbTx = Omit<ScopedClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

/**
 * $transaction interaktif: akun di-resolve SEBELUM transaksi dimulai (SQLite hanya punya
 * satu koneksi, jadi query sesi di tengah transaksi bisa macet), lalu tx disimpan agar
 * pengecekan foreign key melihat baris yang dibuat di transaksi yang sama.
 */
async function scopedTransaction(arg: unknown, opts?: unknown) {
  if (typeof arg !== "function") return (scoped.$transaction as (a: unknown, o?: unknown) => Promise<unknown>)(arg, opts);
  const scope = await currentScope();
  // Gagal sebelum transaksi dibuka: tidak ada yang perlu di-rollback
  if (scope.readOnly) throw new Error(READ_ONLY_MESSAGE);
  const fn = arg as (tx: unknown) => Promise<unknown>;
  return (scoped.$transaction as (f: (tx: unknown) => Promise<unknown>, o?: unknown) => Promise<unknown>)(
    (tx) => txStore.run({ tx, scope }, async () => await fn(tx)),
    opts,
  );
}

export const db: ScopedClient = new Proxy(scoped, {
  get(target, prop, receiver) {
    if (prop === "$transaction") return scopedTransaction;
    return Reflect.get(target, prop, receiver);
  },
});
