import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { periodStatus, summarizeMonth, type CategoryLite, type MonthSummary } from "@/lib/money";
import type { PeriodStatus } from "@/lib/constants";

// cache(): dipanggil berkali-kali dalam satu request (dashboard + target) tapi DB hanya dibaca sekali.
export const getCategories = cache(async (): Promise<(CategoryLite & { color: string })[]> => {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, kind: true, targetBps: true, color: true },
  });
});

export type PeriodRow = {
  id: number;
  month: string;
  isPlan: boolean;
  note: string | null;
  status: PeriodStatus;
  summary: MonthSummary;
};

/** Semua bulan + ringkasan, dihitung dari transaksi. Urut naik. */
export const getAllPeriodSummaries = cache(async (): Promise<PeriodRow[]> => {
  const [categories, periods] = await Promise.all([
    getCategories(),
    db.monthlyPeriod.findMany({
      orderBy: { month: "asc" },
      include: { transactions: { select: { name: true, categoryId: true, amount: true, isPaid: true } } },
    }),
  ]);
  return periods.map((p) => {
    const summary = summarizeMonth(p.salary, p.transactions, categories);
    return {
      id: p.id,
      month: p.month,
      isPlan: p.isPlan,
      note: p.note,
      status: periodStatus(p.isPlan, p.salary, summary.missingAmountCount),
      summary,
    };
  });
});

export async function getPeriodDetail(month: string) {
  const [categories, period] = await Promise.all([
    getCategories(),
    db.monthlyPeriod.findFirst({
      where: { month },
      include: {
        transactions: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          select: { id: true, name: true, categoryId: true, amount: true, isPaid: true, note: true, source: true, goalId: true },
        },
      },
    }),
  ]);
  if (!period) return null;
  const summary = summarizeMonth(period.salary, period.transactions, categories);
  return {
    period,
    categories,
    summary,
    status: periodStatus(period.isPlan, period.salary, summary.missingAmountCount),
  };
}

/** Nama transaksi yang pernah dipakai + template, untuk saran input cepat. */
export async function getNameSuggestions(): Promise<{ name: string; categoryId: number; amount: number | null }[]> {
  const [templates, recent] = await Promise.all([
    db.recurringTemplate.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.transaction.findMany({
      orderBy: { id: "desc" },
      take: 300,
      select: { name: true, categoryId: true, amount: true },
    }),
  ]);
  const seen = new Set<string>();
  const out: { name: string; categoryId: number; amount: number | null }[] = [];
  for (const r of [...recent, ...templates.map((t) => ({ name: t.name, categoryId: t.categoryId, amount: t.defaultAmount }))]) {
    const k = r.name.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export const getGoalOptions = cache(async () => {
  return db.goal.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }], select: { id: true, name: true } });
});
