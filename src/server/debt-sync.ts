import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeName } from "@/lib/money";

/*
 * Sinkron "Saldo & rencana per bulan" (DebtPlan) <-> item bulanan dari template rutin.
 * Template yang punya debtId mengambil nominal bulan itu dari rencana bayar hutangnya.
 * Item bulanan dihubungkan lewat Transaction.debtPlanId (satu rencana = satu item).
 * Aturan nominal: rencana bulan itu jika ada, kalau tidak nominal default template.
 */

type Tx = Prisma.TransactionClient;

export type PlannedItem = { debtPlanId: number; amount: number; isPaid: boolean };

/**
 * Untuk bulan `month`: nama template (dinormalisasi) -> rencana bayar yang belum punya item.
 * Dipakai saat membuat bulan / menambah item template agar nominal langsung dari rencana.
 */
export async function plannedItemsForMonth(tx: Tx, month: string): Promise<Map<string, PlannedItem>> {
  const templates = await tx.recurringTemplate.findMany({ where: { debtId: { not: null } }, select: { name: true, debtId: true } });
  const out = new Map<string, PlannedItem>();
  if (!templates.length) return out;
  const plans = await tx.debtPlan.findMany({
    where: { month, debtId: { in: templates.map((t) => t.debtId!) }, transaction: { is: null } },
  });
  for (const t of templates) {
    const p = plans.find((x) => x.debtId === t.debtId);
    if (p) out.set(normalizeName(t.name), { debtPlanId: p.id, amount: p.amount, isPaid: p.paid });
  }
  return out;
}

/**
 * Rencana bayar baru/berubah tanpa item tertaut: cari item template hutang itu di bulan yang sama
 * (berdasarkan nama template), lalu tautkan dan samakan nominal + status dibayar.
 * Bulan yang belum dibuat tidak dibuat di sini; item diisi saat bulan dibuat.
 */
export async function linkPlanToTemplateItem(tx: Tx, planId: number): Promise<boolean> {
  const plan = await tx.debtPlan.findUniqueOrThrow({ where: { id: planId }, include: { transaction: true } });
  if (plan.transaction) return false;
  const templates = await tx.recurringTemplate.findMany({ where: { debtId: plan.debtId }, select: { name: true } });
  if (!templates.length) return false;
  const period = await tx.monthlyPeriod.findUnique({ where: { month: plan.month }, select: { id: true } });
  if (!period) return false;
  const names = new Set(templates.map((t) => normalizeName(t.name)));
  const candidates = await tx.transaction.findMany({
    where: { periodId: period.id, debtPlanId: null, receivableInstallmentId: null, receivableEntryId: null },
    orderBy: { sortOrder: "asc" },
  });
  const item = candidates.find((c) => names.has(normalizeName(c.name)));
  if (!item) return false;
  await tx.transaction.update({ where: { id: item.id }, data: { debtPlanId: plan.id, amount: plan.amount, isPaid: plan.paid } });
  return true;
}

/** Semua rencana hutang ini yang belum punya item: tautkan ke item template di bulannya. */
export async function linkAllPlansOfDebt(tx: Tx, debtId: number): Promise<number> {
  const plans = await tx.debtPlan.findMany({ where: { debtId, transaction: { is: null } }, select: { id: true } });
  let n = 0;
  for (const p of plans) if (await linkPlanToTemplateItem(tx, p.id)) n++;
  return n;
}

/** Nominal default template yang terhubung ke hutang ini dengan nama item tersebut (untuk saat rencana dihapus). */
export async function templateDefaultFor(tx: Tx, debtId: number, itemName: string): Promise<number | null | undefined> {
  const templates = await tx.recurringTemplate.findMany({ where: { debtId }, select: { name: true, defaultAmount: true } });
  return templates.find((t) => normalizeName(t.name) === normalizeName(itemName))?.defaultAmount;
}
