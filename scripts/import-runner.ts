// Inti import CSV untuk `npm run import` (dijalankan di laptop, tidak dibawa ke server).
// Idempotent: setiap baris punya kunci import; menjalankan ulang tidak menggandakan data.
import { db } from "../src/lib/db";
import { buildImportPlan, type Issue } from "../src/lib/import/plan";
import { planInvestasi, type InvestasiPlan } from "../src/lib/import/investasi";
import { verifyMonth, type Mismatch } from "../src/lib/import/verify";
import { summarizeMonth } from "../src/lib/money";

export const IMPORT_FILES = {
  transaksi: "transaksi.csv",
  ringkasan: "ringkasan_bulanan.csv",
  riwayatGaji: "riwayat_gaji.csv",
  assetTracker: "asset_tracker.csv",
  hutang: "hutang.csv",
} as const;
export type ImportFileKey = keyof typeof IMPORT_FILES;

/** Petakan nama file ke jenis import. "investasi" untuk sheet Investasi. */
export function classifyFile(name: string): ImportFileKey | "investasi" | null {
  const n = name.toLowerCase().trim();
  for (const [k, f] of Object.entries(IMPORT_FILES) as [ImportFileKey, string][]) if (n === f) return k;
  if (/investasi.*\.csv$/.test(n)) return "investasi";
  if (/ringkasan/.test(n)) return "ringkasan";
  if (/riwayat|gaji/.test(n)) return "riwayatGaji";
  if (/asset|aset/.test(n)) return "assetTracker";
  if (/hutang/.test(n)) return "hutang";
  if (/transaksi/.test(n)) return "transaksi";
  return null;
}

class DryRunRollback extends Error {}

export type Counter = { created: number; updated: number; unchanged: number; deleted: number };
const counter = (): Counter => ({ created: 0, updated: 0, unchanged: 0, deleted: 0 });

function guessDebtKind(name: string): string {
  const n = name.toLowerCase();
  if (/paylater|spaylater|kredivo|akulaku|gopaylater/.test(n)) return "PAYLATER";
  if (/kredit|card|kartu|cc\b/.test(n)) return "KARTU";
  if (/asuransi/.test(n)) return "LAINNYA";
  return "KARTU";
}


export type ImportReport = {
  dryRun: boolean;
  stats: Record<"bulan" | "transaksi" | "aset" | "hutang" | "investasi", Counter>;
  created: { assetTypes: string[]; debts: string[] };
  issues: Issue[];
  mismatches: Mismatch[];
  expectations: number;
  investasi: { investments: number; receivables: number; targets: number; physical: number; goals: number; resolutions: number } | null;
};

export async function runImport(
  files: Partial<Record<ImportFileKey, string>>,
  investasiText: string | null,
  opts: { dryRun?: boolean; force?: boolean; prune?: boolean } = {},
): Promise<ImportReport> {
  const DRY = !!opts.dryRun;
  const FORCE = !!opts.force;
  const PRUNE = !!opts.prune;
  const inv: InvestasiPlan | null = investasiText ? planInvestasi(investasiText) : null;

  const categories = await db.category.findMany();
  if (categories.length === 0) throw new Error("Kategori kosong. Jalankan `npm run db:seed` dulu.");
  const catId = new Map(categories.map((c) => [c.name, c.id]));

  const plan = buildImportPlan(files, categories.map((c) => c.name));
  if (inv) plan.issues.push(...inv.issues);
  const stats = { bulan: counter(), transaksi: counter(), aset: counter(), hutang: counter(), investasi: counter() };
  const created = { assetTypes: [] as string[], debts: [] as string[] };
  const mismatches: Mismatch[] = [];

  try {
    await db.$transaction(
      async (tx) => {
        // 1. Bulan
        const periodId = new Map<string, number>();
        const existingPeriods = new Map((await tx.monthlyPeriod.findMany()).map((p) => [p.month, p]));
        for (const p of plan.periods) {
          const ex = existingPeriods.get(p.month);
          if (!ex) {
            const row = await tx.monthlyPeriod.create({ data: p });
            periodId.set(p.month, row.id);
            stats.bulan.created++;
          } else {
            periodId.set(p.month, ex.id);
            const salary = FORCE || ex.salary === null ? p.salary : ex.salary;
            const isPlan = FORCE ? p.isPlan : ex.isPlan;
            if (salary !== ex.salary || isPlan !== ex.isPlan) {
              await tx.monthlyPeriod.update({ where: { id: ex.id }, data: { salary, isPlan } });
              stats.bulan.updated++;
            } else stats.bulan.unchanged++;
          }
        }

        // 2. Transaksi
        const existingTx = new Map(
          (await tx.transaction.findMany({ where: { importKey: { not: null } } })).map((t) => [t.importKey!, t]),
        );
        const maxOrder = new Map<number, number>();
        for (const t of plan.transactions) {
          const pid = periodId.get(t.month)!;
          const data = {
            periodId: pid,
            name: t.name,
            categoryId: catId.get(t.category)!,
            amount: t.amount,
            isPaid: t.isPaid,
            note: t.note,
            source: "IMPORT",
          };
          const ex = existingTx.get(t.importKey);
          if (!ex) {
            if (!maxOrder.has(pid)) {
              const agg = await tx.transaction.aggregate({ where: { periodId: pid }, _max: { sortOrder: true } });
              maxOrder.set(pid, agg._max.sortOrder ?? 0);
            }
            const order = maxOrder.get(pid)! + 1;
            maxOrder.set(pid, order);
            await tx.transaction.create({ data: { ...data, importKey: t.importKey, sortOrder: order } });
            stats.transaksi.created++;
          } else if (FORCE) {
            await tx.transaction.update({ where: { id: ex.id }, data });
            stats.transaksi.updated++;
          } else stats.transaksi.unchanged++;
        }
        if (PRUNE) {
          const keep = new Set(plan.transactions.map((t) => t.importKey));
          const stale = [...existingTx.values()].filter((t) => t.source === "IMPORT" && !keep.has(t.importKey!));
          if (stale.length) {
            await tx.transaction.deleteMany({ where: { id: { in: stale.map((t) => t.id) } } });
            stats.transaksi.deleted = stale.length;
          }
        }

        // 3. Asset Tracker
        const types = await tx.assetType.findMany();
        const typeId = new Map(types.map((t) => [t.name.toLowerCase(), t.id]));
        for (const c of plan.assets) {
          let id = typeId.get(c.label.toLowerCase());
          if (!id) {
            id = (await tx.assetType.create({ data: { name: c.label, sortOrder: 100 + typeId.size } })).id;
            typeId.set(c.label.toLowerCase(), id);
            created.assetTypes.push(c.label);
          }
          const ex = await tx.assetSnapshot.findUnique({ where: { month_assetTypeId: { month: c.month, assetTypeId: id } } });
          if (!ex) {
            await tx.assetSnapshot.create({ data: { month: c.month, assetTypeId: id, value: c.value } });
            stats.aset.created++;
          } else if (FORCE && ex.value !== c.value) {
            await tx.assetSnapshot.update({ where: { id: ex.id }, data: { value: c.value } });
            stats.aset.updated++;
          } else stats.aset.unchanged++;
        }

        // 4. Saldo hutang per bulan
        const debts = await tx.debt.findMany();
        const debtId = new Map(debts.map((d) => [d.name.toLowerCase(), d.id]));
        for (const c of plan.debts) {
          let id = debtId.get(c.label.toLowerCase());
          if (!id) {
            id = (await tx.debt.create({ data: { name: c.label, kind: guessDebtKind(c.label), sortOrder: debtId.size + 1 } })).id;
            debtId.set(c.label.toLowerCase(), id);
            created.debts.push(c.label);
          }
          const ex = await tx.debtSnapshot.findUnique({ where: { debtId_month: { debtId: id, month: c.month } } });
          if (!ex) {
            await tx.debtSnapshot.create({ data: { debtId: id, month: c.month, balance: c.value } });
            stats.hutang.created++;
          } else if (FORCE && ex.balance !== c.value) {
            await tx.debtSnapshot.update({ where: { id: ex.id }, data: { balance: c.value } });
            stats.hutang.updated++;
          } else stats.hutang.unchanged++;
        }

        // 4b. Sheet Investasi: investasi, piutang, target portofolio, aset fisik, target, resolusi
        if (inv) {
          const typeByName = async (name: string) => {
            let id = typeId.get(name.toLowerCase());
            if (!id) {
              id = (await tx.assetType.create({ data: { name, sortOrder: 100 + typeId.size } })).id;
              typeId.set(name.toLowerCase(), id);
              created.assetTypes.push(name);
            }
            return id;
          };
          const platforms = new Map((await tx.platform.findMany()).map((p) => [p.name.toLowerCase(), p.id]));
          const platformByName = async (name: string | null) => {
            if (!name) return null;
            let id = platforms.get(name.toLowerCase());
            if (!id) {
              id = (await tx.platform.create({ data: { name, sortOrder: 100 + platforms.size } })).id;
              platforms.set(name.toLowerCase(), id);
            }
            return id;
          };
          const c = stats.investasi;
          for (const i of inv.investments) {
            const data = {
              platformId: await platformByName(i.platform),
              assetTypeId: await typeByName(i.assetType),
              description: i.description,
              principal: i.principal,
            };
            const ex = await tx.investment.findFirst({ where: data });
            if (ex) {
              if (FORCE) {
                await tx.investment.update({ where: { id: ex.id }, data: { currentValue: i.currentValue, valueUpdatedAt: inv.updateDate } });
                c.updated++;
              } else c.unchanged++;
            } else {
              await tx.investment.create({ data: { ...data, currentValue: i.currentValue, valueUpdatedAt: inv.updateDate, sortOrder: i.line } });
              c.created++;
            }
          }
          for (const r of inv.receivables) {
            if (await tx.receivable.findFirst({ where: { name: r.name } })) {
              c.unchanged++;
              continue;
            }
            await tx.receivable.create({
              data: {
                name: r.name,
                kind: "BEBAS",
                note: `Dari sheet Investasi${r.platform ? ` (via ${r.platform})` : ""}.`,
                entries: { create: [{ date: inv.updateDate ?? new Date(), description: "Pinjaman awal", amount: r.principal }] },
              },
            });
            c.created++;
          }
          if (inv.month) {
            for (const t of inv.targets) {
              const id = await typeByName(t.assetType);
              const ex = await tx.portfolioTarget.findUnique({ where: { month_assetTypeId: { month: inv.month, assetTypeId: id } } });
              if (!ex) {
                await tx.portfolioTarget.create({ data: { month: inv.month, assetTypeId: id, amount: t.amount } });
                c.created++;
              } else c.unchanged++;
            }
          }
          for (const ph of inv.physical) {
            if (await tx.physicalAsset.findFirst({ where: { name: ph.name } })) c.unchanged++;
            else {
              await tx.physicalAsset.create({ data: { name: ph.name, value: ph.value, sortOrder: ph.line } });
              c.created++;
            }
          }
          let prio = (await tx.goal.aggregate({ _max: { priority: true } }))._max.priority ?? 0;
          for (const g of inv.goals) {
            if (await tx.goal.findFirst({ where: { name: g.name } })) c.unchanged++;
            else {
              await tx.goal.create({ data: { name: g.name, targetAmount: BigInt(g.target), manualCollected: BigInt(g.collected), priority: ++prio } });
              c.created++;
            }
          }
          const year = inv.updateDate?.getFullYear() ?? new Date().getFullYear();
          for (const [k, r] of inv.resolutions.entries()) {
            if (await tx.resolution.findFirst({ where: { year, text: r.text } })) c.unchanged++;
            else {
              await tx.resolution.create({ data: { year, text: r.text, sortOrder: k + 1 } });
              c.created++;
            }
          }
        }

        // 5. Verifikasi: hitung ulang dari transaksi di DB vs ringkasan_bulanan.csv
        const cats = await tx.category.findMany();
        for (const e of plan.expectations) {
          const p = await tx.monthlyPeriod.findUnique({ where: { month: e.month }, include: { transactions: true } });
          mismatches.push(...verifyMonth(e, p ? summarizeMonth(p.salary, p.transactions, cats) : undefined));
        }

        if (DRY) throw new DryRunRollback();
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
  } catch (e) {
    if (!(e instanceof DryRunRollback)) throw e;
  }

  return {
    dryRun: DRY,
    stats,
    created,
    issues: plan.issues,
    mismatches,
    expectations: plan.expectations.length,
    investasi: inv
      ? {
          investments: inv.investments.length,
          receivables: inv.receivables.length,
          targets: inv.targets.length,
          physical: inv.physical.length,
          goals: inv.goals.length,
          resolutions: inv.resolutions.length,
        }
      : null,
  };
}
