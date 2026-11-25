import type { Metadata } from "next";
import Link from "next/link";
import { Cake, Percent, Sprout, Target } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HeroCard, StatCard } from "@/components/ui-kit";
import { db } from "@/lib/db";
import { formatBps, formatPercent, formatRupiah } from "@/lib/format";
import { getGoalsView } from "@/server/goals";
import { GoalList } from "./goals";
import { Resolutions } from "./resolutions";

export const metadata: Metadata = { title: "Target & FIRE" };

export default async function TargetPage({ searchParams }: PageProps<"/target">) {
  const sp = await searchParams;
  const year = typeof sp.tahun === "string" && /^\d{4}$/.test(sp.tahun) ? Number(sp.tahun) : new Date().getFullYear();
  const [view, assetTypes, resolutions] = await Promise.all([
    getGoalsView(),
    db.assetType.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.resolution.findMany({ where: { year }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
  ]);
  const totalTarget = view.goals.reduce((s, g) => s + g.target, 0);
  const totalCollected = view.goals.reduce((s, g) => s + Math.min(g.collected, g.target), 0);
  const totalRequired = view.goals.reduce((s, g) => s + (g.fire.requiredMonthly ?? 0), 0);
  const totalExtra = view.goals.reduce((s, g) => s + g.extra, 0);

  return (
    <>
      <PageHeader title="Target & FIRE" description="Target keuangan, tangga ternak uang, dan kalkulator FIRE." />
      <div className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-3">
          <HeroCard
            className="lg:col-span-2"
            label={
              <>
                <Target className="size-4" /> Total terkumpul semua target
              </>
            }
            value={formatRupiah(totalCollected)}
          >
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${totalTarget ? Math.min(100, (totalCollected / totalTarget) * 100) : 0}%` }} />
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/20 pt-5 text-sm">
              <div>
                <dt className="text-xs text-white/75">Total target</dt>
                <dd className="mt-1 font-semibold">{formatRupiah(totalTarget)}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/75">Butuh / bulan</dt>
                <dd className="mt-1 font-semibold">{formatRupiah(totalRequired)}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/75">Cari tambahan / bulan</dt>
                <dd className="mt-1 font-semibold">{formatRupiah(totalExtra)}</dd>
              </div>
            </dl>
          </HeroCard>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-5">
            <StatCard
              icon={Sprout}
              tone="positive"
              label="Kapasitas dari gaji"
              value={formatRupiah(view.capacity)}
              hint={view.capacityMonths ? `Rata-rata Masa Depan ${view.capacityMonths} bln tercatat` : "Belum ada bulan tercatat"}
            />
            <StatCard
              icon={view.age === null ? Cake : Percent}
              tone="brand"
              label={view.age === null ? "Tanggal lahir belum diisi" : `Usia ${view.age} tahun`}
              value={`${formatBps(view.rateBps)} bunga`}
              hint={
                <>
                  Pajak {formatBps(view.taxBps)} ·{" "}
                  <Link href="/pengaturan" className="text-primary underline-offset-2 hover:underline">
                    ubah di Pengaturan
                  </Link>
                </>
              }
            />
          </div>
        </div>

        <GoalList goals={view.goals} assetTypes={assetTypes} hasBirthDate={view.birthDate !== null} />

        <Resolutions year={year} items={resolutions.map((r) => ({ id: r.id, text: r.text, done: r.done }))} />
        <p className="text-xs text-muted-foreground">
          Butuh/bulan = sisa target ÷ sisa bulan. Kapasitas gaji dibagikan berurutan sesuai tangga (prioritas); sisanya harus dari uang
          tambahan. Return bunga = target × bunga deposito ÷ 12, bersih setelah pajak {formatPercent(view.taxBps / 10000, 0)}.
        </p>
      </div>
    </>
  );
}
