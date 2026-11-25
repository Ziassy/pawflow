"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { DEBT_KIND, GOAL_COLLECTED_MODE } from "@/lib/constants";
import { addMonths } from "@/lib/format";
import { buildInstallments } from "@/lib/debt";
import { valueByAssetType } from "@/lib/investment";
import { zMonth } from "@/lib/schemas";
import { requireAuth } from "./auth";
import { fail, linkOrCreateTransaction, refresh } from "./action-utils";
import type { ActionResult } from "./actions";

const zMoney = z.number().int("Nominal harus bilangan bulat").min(0, "Nominal tidak boleh negatif").max(2_000_000_000);
const zMoneySigned = z.number().int().min(-2_000_000_000).max(2_000_000_000);
const zName = z.string().trim().min(1, "Nama wajib diisi").max(120);

async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  await requireAuth();
  try {
    await fn();
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

// ===========================================================================
// Hutang
// ===========================================================================

const zDebt = z.object({ name: zName, kind: z.enum(DEBT_KIND), note: z.string().trim().max(500).nullable().optional(), active: z.boolean() });

export async function saveDebt(id: number | null, input: z.input<typeof zDebt>) {
  return run(async () => {
    const data = zDebt.parse(input);
    if (id) await db.debt.update({ where: { id }, data });
    else {
      const max = await db.debt.aggregate({ _max: { sortOrder: true } });
      await db.debt.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    }
  });
}

export async function deleteDebt(id: number) {
  return run(async () => {
    // Transaksi yang sudah tercatat tetap ada; tautannya dilepas (onDelete: SetNull)
    await db.debt.delete({ where: { id } });
  });
}

/** Saldo per bulan; null = hapus (kosong). */
export async function setDebtSnapshot(debtId: number, month: string, balance: number | null) {
  return run(async () => {
    zMonth.parse(month);
    if (balance === null) {
      await db.debtSnapshot.deleteMany({ where: { debtId, month } });
      return;
    }
    const v = zMoneySigned.parse(balance);
    await db.debtSnapshot.upsert({
      where: { debtId_month: { debtId, month } },
      update: { balance: v },
      create: { debtId, month, balance: v },
    });
  });
}

/** Rencana bayar per bulan; null = hapus. Jika sudah dibayar, transaksi ikut diperbarui. */
export async function setDebtPlan(debtId: number, month: string, amount: number | null) {
  return run(async () => {
    zMonth.parse(month);
    await db.$transaction(async (tx) => {
      const ex = await tx.debtPlan.findUnique({ where: { debtId_month: { debtId, month } }, include: { transaction: true } });
      if (amount === null || amount === 0) {
        if (ex?.paid) throw new Error("Rencana sudah dibayar. Batalkan centang dibayar dulu.");
        if (ex) await tx.debtPlan.delete({ where: { id: ex.id } });
        return;
      }
      const v = zMoney.parse(amount);
      if (!ex) {
        await tx.debtPlan.create({ data: { debtId, month, amount: v } });
        return;
      }
      await tx.debtPlan.update({ where: { id: ex.id }, data: { amount: v } });
      if (ex.transaction) await tx.transaction.update({ where: { id: ex.transaction.id }, data: { amount: v } });
    });
  });
}

/** Centang dibayar -> transaksi Cicilan di bulan itu (hubungkan ke yang sudah ada jika cocok). */
export async function setDebtPlanPaid(planId: number, paid: boolean) {
  return run(async () => {
    await db.$transaction(async (tx) => {
      const plan = await tx.debtPlan.findUniqueOrThrow({ where: { id: planId }, include: { debt: true, transaction: true } });
      if (paid === plan.paid) return;
      if (paid) {
        await linkOrCreateTransaction(tx, {
          month: plan.month,
          name: plan.debt.name,
          amount: plan.amount,
          category: "Cicilan",
          source: "DEBT_PLAN",
          link: { debtPlanId: plan.id },
        });
      } else if (plan.transaction) {
        // Transaksi otomatis dihapus; transaksi manual yang ditautkan hanya dilepas
        if (plan.transaction.source === "DEBT_PLAN") await tx.transaction.delete({ where: { id: plan.transaction.id } });
        else await tx.transaction.update({ where: { id: plan.transaction.id }, data: { debtPlanId: null } });
      }
      await tx.debtPlan.update({ where: { id: planId }, data: { paid } });
    });
  });
}

const zEntry = z.object({ date: z.coerce.date(), description: z.string().trim().min(1, "Keterangan wajib diisi").max(200), amount: zMoneySigned });

export async function addDebtEntry(debtId: number, input: z.input<typeof zEntry>) {
  return run(async () => {
    await db.debtEntry.create({ data: { debtId, ...zEntry.parse(input) } });
  });
}

export async function deleteDebtEntry(id: number) {
  return run(() => db.debtEntry.delete({ where: { id } }));
}

// ===========================================================================
// Piutang
// ===========================================================================

const zReceivable = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("CICILAN"),
    name: zName,
    principal: zMoney,
    installmentCount: z.number().int().min(1, "Minimal 1 cicilan").max(120),
    installmentAmount: zMoney,
    dueDay: z.number().int().min(1).max(31).nullable(),
    startMonth: zMonth,
    note: z.string().trim().max(500).nullable().optional(),
  }),
  z.object({
    kind: z.literal("BEBAS"),
    name: zName,
    note: z.string().trim().max(500).nullable().optional(),
    dueDay: z.number().int().min(1).max(31).nullable().optional(),
    /** Hanya saat membuat baru: pinjaman awal */
    initial: z.object({ date: z.coerce.date(), amount: zMoney.refine((v) => v > 0, "Nominal pinjaman wajib diisi") }).optional(),
  }),
]);

export async function saveReceivable(id: number | null, input: z.input<typeof zReceivable>) {
  return run(async () => {
    const data = zReceivable.parse(input);
    await db.$transaction(async (tx) => {
      if (data.kind === "BEBAS") {
        const base = { name: data.name, note: data.note ?? null, dueDay: data.dueDay ?? null, kind: "BEBAS" };
        if (!id) {
          await tx.receivable.create({
            data: {
              ...base,
              entries: data.initial ? { create: [{ date: data.initial.date, description: "Pinjaman awal", amount: data.initial.amount }] } : undefined,
            },
          });
        } else {
          const ex = await tx.receivable.findUniqueOrThrow({ where: { id } });
          if (ex.kind !== "BEBAS") throw new Error("Jenis piutang tidak bisa diubah setelah dibuat");
          await tx.receivable.update({ where: { id }, data: base });
        }
        return;
      }
      const { kind, ...rest } = data;
      const schedule = buildInstallments(rest.startMonth, rest.installmentCount, rest.installmentAmount, addMonths);
      if (!id) {
        await tx.receivable.create({ data: { ...rest, kind, installments: { create: schedule } } });
        return;
      }
      const ex = await tx.receivable.findUniqueOrThrow({ where: { id }, include: { installments: true } });
      if (ex.kind !== "CICILAN") throw new Error("Jenis piutang tidak bisa diubah setelah dibuat");
      const structural =
        ex.installmentCount !== rest.installmentCount || ex.installmentAmount !== rest.installmentAmount || ex.startMonth !== rest.startMonth;
      if (structural && ex.installments.some((i) => i.paid)) {
        throw new Error("Jadwal tidak bisa diubah karena sudah ada cicilan lunas. Ubah nama/catatan saja.");
      }
      await tx.receivable.update({ where: { id }, data: rest });
      if (structural) {
        await tx.receivableInstallment.deleteMany({ where: { receivableId: id } });
        await tx.receivableInstallment.createMany({ data: schedule.map((sc) => ({ ...sc, receivableId: id })) });
      }
    });
  });
}

const zReceivableEntry = z.object({
  date: z.coerce.date(),
  description: z.string().trim().max(200),
  /** Selalu positif; arah dari `direction` */
  amount: zMoney.refine((v) => v > 0, "Nominal wajib diisi"),
  direction: z.enum(["PINJAM", "BAYAR"]),
  /** BAYAR: catat juga sebagai transaksi Pemasukan di bulan tanggal tsb */
  recordIncome: z.boolean().default(true),
});

/** Piutang BEBAS: catat pinjam lagi (+) atau pembayaran (−). */
export async function addReceivableEntry(receivableId: number, input: z.input<typeof zReceivableEntry>) {
  return run(async () => {
    const d = zReceivableEntry.parse(input);
    await db.$transaction(async (tx) => {
      const r = await tx.receivable.findUniqueOrThrow({ where: { id: receivableId } });
      if (r.kind !== "BEBAS") throw new Error("Catatan hanya untuk piutang jenis bayar bebas");
      const description = d.description || (d.direction === "PINJAM" ? "Pinjam lagi" : "Bayar");
      const entry = await tx.receivableEntry.create({
        data: { receivableId, date: d.date, description, amount: d.direction === "PINJAM" ? d.amount : -d.amount },
      });
      if (d.direction === "BAYAR" && d.recordIncome) {
        const month = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}`;
        await linkOrCreateTransaction(tx, {
          month,
          name: `Piutang ${r.name}`,
          matchNames: [r.name],
          amount: d.amount,
          category: "Pemasukan",
          source: "RECEIVABLE",
          link: { receivableEntryId: entry.id },
        });
      }
    });
  });
}

export async function deleteReceivableEntry(entryId: number) {
  return run(async () => {
    await db.$transaction(async (tx) => {
      const e = await tx.receivableEntry.findUniqueOrThrow({ where: { id: entryId }, include: { transaction: true } });
      if (e.transaction) {
        if (e.transaction.source === "RECEIVABLE") await tx.transaction.delete({ where: { id: e.transaction.id } });
        else await tx.transaction.update({ where: { id: e.transaction.id }, data: { receivableEntryId: null } });
      }
      await tx.receivableEntry.delete({ where: { id: entryId } });
    });
  });
}

export async function deleteReceivable(id: number) {
  return run(() => db.receivable.delete({ where: { id } }));
}

/** Centang lunas -> transaksi Pemasukan di bulan cicilan (unik per cicilan, tidak dobel). */
export async function setInstallmentPaid(installmentId: number, paid: boolean) {
  return run(async () => {
    await db.$transaction(async (tx) => {
      const inst = await tx.receivableInstallment.findUniqueOrThrow({
        where: { id: installmentId },
        include: { receivable: true, transaction: true },
      });
      if (inst.paid === paid) return;
      if (paid) {
        await linkOrCreateTransaction(tx, {
          month: inst.month,
          name: `Piutang ${inst.receivable.name} (${inst.seq}/${inst.receivable.installmentCount})`,
          matchNames: [inst.receivable.name, `Piutang ${inst.receivable.name}`],
          amount: inst.amount,
          category: "Pemasukan",
          source: "RECEIVABLE",
          link: { receivableInstallmentId: inst.id },
        });
      } else if (inst.transaction) {
        if (inst.transaction.source === "RECEIVABLE") await tx.transaction.delete({ where: { id: inst.transaction.id } });
        else await tx.transaction.update({ where: { id: inst.transaction.id }, data: { receivableInstallmentId: null } });
      }
      await tx.receivableInstallment.update({ where: { id: installmentId }, data: { paid, paidAt: paid ? new Date() : null } });
    });
  });
}

// ===========================================================================
// Investasi & aset
// ===========================================================================

const zInvestment = z.object({
  platformId: z.number().int().positive().nullable(),
  assetTypeId: z.number().int().positive().nullable(),
  description: z.string().trim().max(200).nullable(),
  principal: zMoney,
  currentValue: zMoney.nullable(),
});

export async function saveInvestment(id: number | null, input: z.input<typeof zInvestment>) {
  return run(async () => {
    const data = { ...zInvestment.parse(input), valueUpdatedAt: new Date() };
    if (id) await db.investment.update({ where: { id }, data });
    else {
      const max = await db.investment.aggregate({ _max: { sortOrder: true } });
      await db.investment.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    }
  });
}

export async function deleteInvestment(id: number) {
  return run(() => db.investment.delete({ where: { id } }));
}

/** Satu sel Asset Tracker. null = kosong (hapus), bukan 0. */
export async function setAssetSnapshot(month: string, assetTypeId: number, value: number | null) {
  return run(async () => {
    zMonth.parse(month);
    if (value === null) {
      await db.assetSnapshot.deleteMany({ where: { month, assetTypeId } });
      return;
    }
    const v = zMoneySigned.parse(value);
    await db.assetSnapshot.upsert({
      where: { month_assetTypeId: { month, assetTypeId } },
      update: { value: v },
      create: { month, assetTypeId, value: v },
    });
  });
}

/** Salin nilai bulan sebelumnya (yang ada isinya) ke sel kosong bulan ini. */
export async function copyAssetsFromPrevious(month: string): Promise<ActionResult & { copied?: number }> {
  await requireAuth();
  let copied = 0;
  try {
    zMonth.parse(month);
    const prev = await db.assetSnapshot.findFirst({ where: { month: { lt: month } }, orderBy: { month: "desc" } });
    if (!prev) return { ok: false, error: "Belum ada bulan sebelumnya yang terisi" };
    const [src, existing] = await Promise.all([
      db.assetSnapshot.findMany({ where: { month: prev.month } }),
      db.assetSnapshot.findMany({ where: { month } }),
    ]);
    const have = new Set(existing.map((e) => e.assetTypeId));
    const rows = src.filter((s) => !have.has(s.assetTypeId)).map((s) => ({ month, assetTypeId: s.assetTypeId, value: s.value }));
    await db.assetSnapshot.createMany({ data: rows });
    copied = rows.length;
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true, copied };
}

/**
 * Tulis nilai portofolio saat ini (per jenis) ke Asset Tracker bulan `month`.
 * Sel jenis yang ada di portofolio ditimpa; jenis lain di bulan itu dibiarkan.
 * Nilai dihitung ulang di server, bukan dari data yang dikirim browser.
 */
export async function writePortfolioToTracker(month: string): Promise<ActionResult & { written?: number }> {
  await requireAuth();
  let written = 0;
  try {
    zMonth.parse(month);
    const investments = await db.investment.findMany({ select: { assetTypeId: true, principal: true, currentValue: true } });
    const { byType } = valueByAssetType(investments);
    if (!byType.size) return { ok: false, error: "Belum ada posisi investasi yang punya jenis aset" };
    await db.$transaction(
      [...byType].map(([assetTypeId, value]) =>
        db.assetSnapshot.upsert({
          where: { month_assetTypeId: { month, assetTypeId } },
          update: { value },
          create: { month, assetTypeId, value },
        }),
      ),
    );
    written = byType.size;
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true, written };
}

export async function setAssetMonthNote(month: string, note: string) {
  return run(async () => {
    zMonth.parse(month);
    const n = note.trim();
    if (!n) await db.assetMonthNote.deleteMany({ where: { month } });
    else await db.assetMonthNote.upsert({ where: { month }, update: { note: n }, create: { month, note: n } });
  });
}

export async function setPortfolioTarget(month: string, assetTypeId: number, amount: number | null) {
  return run(async () => {
    zMonth.parse(month);
    if (amount === null) {
      await db.portfolioTarget.deleteMany({ where: { month, assetTypeId } });
      return;
    }
    const v = zMoney.parse(amount);
    await db.portfolioTarget.upsert({
      where: { month_assetTypeId: { month, assetTypeId } },
      update: { amount: v },
      create: { month, assetTypeId, amount: v },
    });
  });
}

const zPhysical = z.object({ name: zName, value: zMoney, note: z.string().trim().max(200).nullable().optional() });

export async function savePhysicalAsset(id: number | null, input: z.input<typeof zPhysical>) {
  return run(async () => {
    const data = zPhysical.parse(input);
    if (id) await db.physicalAsset.update({ where: { id }, data });
    else await db.physicalAsset.create({ data });
  });
}

export async function deletePhysicalAsset(id: number) {
  return run(() => db.physicalAsset.delete({ where: { id } }));
}

// ===========================================================================
// Target & FIRE
// ===========================================================================

const zGoal = z.object({
  name: zName,
  targetAmount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  deadline: zMonth.nullable(),
  collectedMode: z.enum(GOAL_COLLECTED_MODE),
  manualCollected: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  assetTypeId: z.number().int().positive().nullable(),
  targetAge: z.number().int().min(1).max(120).nullable(),
  note: z.string().trim().max(500).nullable().optional(),
});

export async function saveGoal(id: number | null, input: z.input<typeof zGoal>) {
  return run(async () => {
    const d = zGoal.parse(input);
    if (d.collectedMode === "ASSET_TYPE" && !d.assetTypeId) throw new Error("Pilih jenis aset untuk mode otomatis");
    const data = { ...d, targetAmount: BigInt(d.targetAmount), manualCollected: BigInt(d.manualCollected) };
    if (id) await db.goal.update({ where: { id }, data });
    else {
      const max = await db.goal.aggregate({ _max: { priority: true } });
      await db.goal.create({ data: { ...data, priority: (max._max.priority ?? 0) + 1 } });
    }
  });
}

export async function deleteGoal(id: number) {
  return run(() => db.goal.delete({ where: { id } }));
}

/** Geser urutan prioritas (tangga) naik/turun. */
export async function moveGoal(id: number, dir: -1 | 1) {
  return run(async () => {
    const goals = await db.goal.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] });
    const i = goals.findIndex((g) => g.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= goals.length) return;
    [goals[i], goals[j]] = [goals[j], goals[i]];
    await db.$transaction(goals.map((g, k) => db.goal.update({ where: { id: g.id }, data: { priority: k + 1 } })));
  });
}

export async function addResolution(year: number, text: string) {
  return run(async () => {
    const t = z.string().trim().min(1, "Isi resolusi").max(300).parse(text);
    const max = await db.resolution.aggregate({ where: { year }, _max: { sortOrder: true } });
    await db.resolution.create({ data: { year, text: t, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  });
}

export async function setResolutionDone(id: number, done: boolean) {
  return run(() => db.resolution.update({ where: { id }, data: { done } }));
}

export async function deleteResolution(id: number) {
  return run(() => db.resolution.delete({ where: { id } }));
}

// ===========================================================================
// Pengaturan
// ===========================================================================

const zSettings = z.object({
  birthDate: z.coerce.date().nullable(),
  depositRateBps: z.number().int().min(0).max(10000),
  interestTaxBps: z.number().int().min(0).max(10000),
  assetDropAlertBps: z.number().int().min(0).max(10000),
});

export async function saveSettings(input: z.input<typeof zSettings>) {
  return run(async () => {
    const data = zSettings.parse(input);
    await db.appSetting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  });
}

export async function saveAssetType(id: number | null, name: string) {
  return run(async () => {
    const n = zName.parse(name);
    if (id) await db.assetType.update({ where: { id }, data: { name: n } });
    else {
      const max = await db.assetType.aggregate({ _max: { sortOrder: true } });
      await db.assetType.create({ data: { name: n, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    }
  });
}

export async function deleteAssetType(id: number) {
  return run(async () => {
    const used = await db.investment.count({ where: { assetTypeId: id } });
    if (used) throw new Error(`Dipakai ${used} investasi. Ubah jenisnya dulu.`);
    await db.assetType.delete({ where: { id } });
  });
}

export async function savePlatform(id: number | null, name: string) {
  return run(async () => {
    const n = zName.parse(name);
    if (id) await db.platform.update({ where: { id }, data: { name: n } });
    else {
      const max = await db.platform.aggregate({ _max: { sortOrder: true } });
      await db.platform.create({ data: { name: n, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    }
  });
}

export async function deletePlatform(id: number) {
  return run(async () => {
    const used = await db.investment.count({ where: { platformId: id } });
    if (used) throw new Error(`Dipakai ${used} investasi. Ubah platformnya dulu.`);
    await db.platform.delete({ where: { id } });
  });
}
