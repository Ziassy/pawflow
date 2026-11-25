import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { toMonthKey } from "@/lib/format";
import { normalizeName } from "@/lib/money";
import type { ActionResult } from "./actions";

/** Error dari database/internal: jangan bocorkan detailnya ke browser. */
export function isInternalError(e: unknown): boolean {
  if (!(e instanceof Error)) return true;
  const n = e.constructor?.name ?? e.name;
  return /^Prisma|Driver|Sqlite|Postgres/i.test(n) || /prisma\.|invocation|SQLITE_|ECONN|P\d{4}/.test(e.message);
}

export function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Input tidak valid" };
  if (isInternalError(e)) {
    console.error(e);
    return { ok: false, error: "Data tidak ditemukan atau sudah berubah. Muat ulang halaman lalu coba lagi." };
  }
  return { ok: false, error: (e as Error).message };
}

export function refresh() {
  revalidatePath("/", "layout");
}

type Tx = Prisma.TransactionClient;

/** Ambil id bulan; buat jika belum ada (bulan depan = Rencana). */
export async function ensurePeriod(tx: Tx, month: string): Promise<number> {
  const p = await tx.monthlyPeriod.findUnique({ where: { month } });
  if (p) return p.id;
  const created = await tx.monthlyPeriod.create({ data: { month, isPlan: month > toMonthKey(new Date()) } });
  return created.id;
}

export async function categoryIdByName(tx: Tx, name: string): Promise<number> {
  const c = await tx.category.findUnique({ where: { name } });
  if (!c) throw new Error(`Kategori "${name}" tidak ada. Jalankan seed.`);
  return c.id;
}

/**
 * Hubungkan ke transaksi yang sudah ada (nama + nominal sama, belum terhubung)
 * agar tidak dobel; jika tidak ada, buat baru.
 */
export async function linkOrCreateTransaction(
  tx: Tx,
  opts: {
    month: string;
    name: string;
    amount: number;
    category: string;
    source: "DEBT_PLAN" | "RECEIVABLE";
    link: { debtPlanId: number } | { receivableInstallmentId: number } | { receivableEntryId: number };
    matchNames?: string[];
  },
) {
  const periodId = await ensurePeriod(tx, opts.month);
  const categoryId = await categoryIdByName(tx, opts.category);
  const candidates = await tx.transaction.findMany({
    where: { periodId, categoryId, amount: opts.amount, debtPlanId: null, receivableInstallmentId: null, receivableEntryId: null },
  });
  const names = new Set([opts.name, ...(opts.matchNames ?? [])].map(normalizeName));
  const match = candidates.find((t) => names.has(normalizeName(t.name)));
  if (match) {
    await tx.transaction.update({ where: { id: match.id }, data: { ...opts.link, isPaid: true } });
    return { linked: true };
  }
  const max = await tx.transaction.aggregate({ where: { periodId }, _max: { sortOrder: true } });
  await tx.transaction.create({
    data: {
      periodId,
      categoryId,
      name: opts.name,
      amount: opts.amount,
      isPaid: true,
      source: opts.source,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      ...opts.link,
    },
  });
  return { linked: false };
}
