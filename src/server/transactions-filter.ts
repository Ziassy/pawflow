import "server-only";
import { db } from "@/lib/db";
import { isMonthKey } from "@/lib/format";
import { normalizeName } from "@/lib/money";

export type TxFilter = { q?: string; month?: string; category?: number; paid?: "ya" | "belum" };

export function parseTxFilter(sp: Record<string, string | string[] | undefined>): TxFilter {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const cat = Number(one("kategori"));
  const paid = one("dibayar");
  const month = one("bulan");
  return {
    q: one("q")?.trim() || undefined,
    month: month && isMonthKey(month) ? month : undefined,
    category: Number.isInteger(cat) && cat > 0 ? cat : undefined,
    paid: paid === "ya" || paid === "belum" ? paid : undefined,
  };
}

/** Transaksi sesuai filter, terbaru dulu. Cari nama dilakukan di JS agar sama di SQLite & PostgreSQL. */
export async function findTransactions(f: TxFilter) {
  const rows = await db.transaction.findMany({
    where: {
      period: f.month ? { month: f.month } : undefined,
      categoryId: f.category,
      isPaid: f.paid ? f.paid === "ya" : undefined,
    },
    orderBy: [{ period: { month: "desc" } }, { sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      amount: true,
      isPaid: true,
      note: true,
      categoryId: true,
      goalId: true,
      category: { select: { name: true, kind: true } },
      period: { select: { month: true } },
    },
  });
  if (!f.q) return rows;
  const q = normalizeName(f.q);
  return rows.filter((r) => normalizeName(r.name).includes(q) || (r.note && normalizeName(r.note).includes(q)));
}
