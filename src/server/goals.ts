import "server-only";
import { db } from "@/lib/db";
import { toMonthKey } from "@/lib/format";
import { ageAt, allocateFromSalary, fire, goalPlan, goalTimeline, type FireResult } from "@/lib/fire";
import { latestSnapshot } from "@/lib/debt";
import { SAVINGS_CATEGORY } from "@/lib/category-theme";
import { getAllPeriodSummaries } from "./queries";

export type GoalView = {
  id: number;
  name: string;
  target: number;
  collected: number;
  collectedMode: string;
  manualCollected: number;
  assetTypeId: number | null;
  assetTypeName: string | null;
  startMonth: string | null;
  /** Tenggat yang diisi (bisa null); lihat `effectiveDeadline` untuk hasil dari usia target */
  deadline: string | null;
  effectiveDeadline: string | null;
  targetAge: number | null;
  note: string | null;
  priority: number;
  monthsLeft: number | null;
  totalMonths: number | null;
  elapsedMonths: number | null;
  /** Target dibagi rata sepanjang lama rencana */
  plannedMonthly: number | null;
  /** Seharusnya sudah terkumpul menurut rencana awal */
  expectedNow: number | null;
  fire: FireResult;
  fromSalary: number;
  extra: number;
};

/** Semua target + kalkulasi FIRE + alokasi kapasitas gaji (tangga ternak uang). */
export async function getGoalsView(now = new Date()) {
  const [goals, settings, snapshots, txSums, periods] = await Promise.all([
    db.goal.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }], include: { assetType: true } }),
    db.appSetting.findFirst(),
    db.assetSnapshot.findMany(),
    db.transaction.groupBy({ by: ["goalId"], where: { goalId: { not: null } }, _sum: { amount: true } }),
    getAllPeriodSummaries(),
  ]);
  const rateBps = settings?.depositRateBps ?? 750;
  const taxBps = settings?.interestTaxBps ?? 2000;
  const birth = settings?.birthDate ?? null;
  const current = toMonthKey(now);
  // Bulan lahir "YYYY-MM" (tanggal lahir disimpan sebagai tanggal UTC)
  const birthMonth = birth ? birth.toISOString().slice(0, 7) : null;

  // Kapasitas dari gaji = rata-rata porsi Masa Depan 6 bulan Tercatat terakhir
  const recorded = periods.filter((p) => p.status === "Tercatat").slice(-6);
  const capacity = recorded.length
    ? Math.round(
        recorded.reduce((s, p) => s + (p.summary.byCategory.find((b) => b.name === SAVINGS_CATEGORY)?.actual ?? 0), 0) / recorded.length,
      )
    : 0;

  const base = goals.map((g) => {
    let collected = Number(g.manualCollected);
    if (g.collectedMode === "ASSET_TYPE" && g.assetTypeId) {
      collected = latestSnapshot(snapshots.filter((s) => s.assetTypeId === g.assetTypeId).map((s) => ({ month: s.month, balance: s.value })), current)?.balance ?? 0;
    } else if (g.collectedMode === "TRANSACTIONS") {
      collected = txSums.find((t) => t.goalId === g.id)?._sum.amount ?? 0;
    }
    // Tenggat yang diisi menang; usia target hanya dipakai bila tenggat kosong.
    // Sisa bulan dihitung dari bulan mulai bila belum dimulai, kalau tidak dari bulan berjalan.
    const timeline = goalTimeline({ startMonth: g.startMonth, deadline: g.deadline, targetAge: g.targetAge, birthMonth, current });
    const target = Number(g.targetAmount);
    return {
      g,
      collected,
      timeline,
      plan: goalPlan(target, timeline),
      fire: fire({ target, collected, monthsLeft: timeline.monthsLeft, rateBps, taxBps }),
      target,
    };
  });
  const alloc = allocateFromSalary(
    base.map((b) => ({ id: b.g.id, required: b.fire.requiredMonthly })),
    capacity,
  );

  const views: GoalView[] = base.map((b) => ({
    id: b.g.id,
    name: b.g.name,
    target: b.target,
    collected: b.collected,
    collectedMode: b.g.collectedMode,
    manualCollected: Number(b.g.manualCollected),
    assetTypeId: b.g.assetTypeId,
    assetTypeName: b.g.assetType?.name ?? null,
    startMonth: b.g.startMonth,
    deadline: b.g.deadline,
    effectiveDeadline: b.timeline.deadline,
    targetAge: b.g.targetAge,
    note: b.g.note,
    priority: b.g.priority,
    monthsLeft: b.timeline.monthsLeft,
    totalMonths: b.timeline.totalMonths,
    elapsedMonths: b.timeline.elapsedMonths,
    plannedMonthly: b.plan.plannedMonthly,
    expectedNow: b.plan.expectedNow,
    fire: b.fire,
    fromSalary: alloc.get(b.g.id)?.fromSalary ?? 0,
    extra: alloc.get(b.g.id)?.extra ?? 0,
  }));

  return {
    goals: views,
    capacity,
    capacityMonths: recorded.length,
    age: birth ? ageAt(birth, now) : null,
    birthDate: birth,
    birthMonth,
    rateBps,
    taxBps,
  };
}
