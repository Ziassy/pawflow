import type { Metadata } from "next";
import { Clock, Gem, Landmark, PiggyBank, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HeroCard, Panel, StatCard, TabLinks } from "@/components/ui-kit";
import { Donut, PercentBars } from "@/components/charts";
import { db } from "@/lib/db";
import { addMonths, formatInstantDay, formatMonth, formatPercent, formatRupiah, isMonthKey, toMonthKey } from "@/lib/format";
import { allocationByType, assetMonthTotals, profitRatio, valueByAssetType } from "@/lib/investment";
import { OTHER_COLOR, seriesColor } from "@/lib/category-theme";
import { cn } from "@/lib/utils";
import { PortfolioTable } from "./portfolio";
import { PortfolioToTracker } from "./portfolio-sync";
import { AssetTracker } from "./tracker";
import { PortfolioTargets } from "./targets";
import { PhysicalAssets } from "./physical";

export const metadata: Metadata = { title: "Investasi & Aset" };

const TABS = [
  { key: "portofolio", label: "Portofolio", href: "/investasi" },
  { key: "tracker", label: "Asset Tracker", href: "/investasi?tab=tracker" },
  { key: "target", label: "Target bulanan", href: "/investasi?tab=target" },
  { key: "fisik", label: "Aset fisik", href: "/investasi?tab=fisik" },
];

export default async function InvestasiPage({ searchParams }: PageProps<"/investasi">) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : "portofolio";
  const month = typeof sp.bulan === "string" && isMonthKey(sp.bulan) ? sp.bulan : toMonthKey(new Date());

  const [assetTypes, usedInv, usedSnap] = await Promise.all([
    db.assetType.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    db.investment.findMany({ select: { assetTypeId: true }, distinct: ["assetTypeId"] }),
    db.assetSnapshot.findMany({ select: { assetTypeId: true }, distinct: ["assetTypeId"] }),
  ]);
  // Warna hanya untuk jenis yang dipakai, urut tetap (sortOrder) -> palet 8 slot cukup
  const used = new Set([...usedInv, ...usedSnap].map((x) => x.assetTypeId));
  const colorOf = new Map(assetTypes.filter((t) => used.has(t.id)).map((t, i) => [t.name, seriesColor(i)]));

  return (
    <>
      <PageHeader title="Investasi & Aset" description="Portofolio, nilai aset per bulan, target, dan aset fisik." />
      <TabLinks tabs={TABS} active={tab} />
      {tab === "portofolio" && <PortfolioTab colorOf={colorOf} />}
      {tab === "tracker" && <TrackerTab assetTypes={assetTypes} colorOf={colorOf} />}
      {tab === "target" && <TargetTab month={month} assetTypes={assetTypes} colorOf={colorOf} />}
      {tab === "fisik" && <PhysicalTab />}
    </>
  );
}

async function PortfolioTab({ colorOf }: { colorOf: Map<string, string> }) {
  const [investments, platforms, assetTypes, snapshots] = await Promise.all([
    db.investment.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { platform: true, assetType: true } }),
    db.platform.findMany({ orderBy: { sortOrder: "asc" } }),
    db.assetType.findMany({ orderBy: { sortOrder: "asc" } }),
    db.assetSnapshot.findMany({ select: { month: true, assetTypeId: true, value: true } }),
  ]);
  // Untuk tombol "Tulis ke Asset Tracker": nilai per jenis + isi tracker yang sudah ada
  const sync = valueByAssetType(investments);
  const syncRows = [...sync.byType]
    .map(([id, value]) => {
      const name = assetTypes.find((t) => t.id === id)?.name ?? "?";
      return { assetTypeId: id, name, value, color: colorOf.get(name) ?? OTHER_COLOR };
    })
    .sort((a, b) => b.value - a.value);
  const snapshotMap: Record<string, Record<number, number>> = {};
  for (const s of snapshots) (snapshotMap[s.month] ??= {})[s.assetTypeId] = s.value;
  const alloc = allocationByType(investments.map((i) => ({ assetType: i.assetType?.name ?? null, principal: i.principal, currentValue: i.currentValue })));
  const totalPrincipal = investments.reduce((s, i) => s + i.principal, 0);
  const lastUpdate = investments.reduce<Date | null>((d, i) => (i.valueUpdatedAt && (!d || i.valueUpdatedAt > d) ? i.valueUpdatedAt : d), null);
  const missingValue = investments.filter((i) => i.currentValue === null).length;

  // Donut: 7 jenis terbesar + gabungan "Lainnya"
  const top = alloc.rows.slice(0, 7);
  const rest = alloc.rows.slice(7);
  const donut = [
    ...top.map((r) => ({ name: r.type, value: r.value, fill: colorOf.get(r.type) ?? OTHER_COLOR })),
    ...(rest.length ? [{ name: "Lainnya", value: rest.reduce((s, r) => s + r.value, 0), fill: OTHER_COLOR }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-3">
        <HeroCard
          className="lg:col-span-2"
          label={
            <>
              <PiggyBank className="size-4" /> Total portofolio
            </>
          }
          value={formatRupiah(alloc.total)}
        >
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/20 pt-5 text-sm">
            <div>
              <dt className="text-xs text-white/75">Modal awal</dt>
              <dd className="mt-1 font-semibold">{formatRupiah(totalPrincipal)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/75">Untung/rugi</dt>
              <dd className="mt-1 font-semibold">{formatPercent(profitRatio(totalPrincipal, alloc.total), 1)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/75">Update terakhir</dt>
              <dd className="mt-1 font-semibold">{lastUpdate ? formatInstantDay(lastUpdate) : "–"}</dd>
            </div>
          </dl>
        </HeroCard>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-5">
          <StatCard icon={TrendingUp} tone="brand" label="Jumlah posisi" value={`${investments.length}`} hint={`${alloc.rows.length} jenis`} />
          <StatCard
            icon={Clock}
            tone={missingValue ? "negative" : "positive"}
            label="Nilai akhir kosong"
            value={`${missingValue}`}
            hint={missingValue ? "Dihitung pakai modal; profit tampil –" : "Semua terisi"}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Alokasi per jenis" className="lg:col-span-1">
          <Donut data={donut} total={alloc.total} centerLabel="Total" empty="Belum ada investasi." />
        </Panel>
        <Panel
          title="Total per jenis"
          className="lg:col-span-2"
          padded={false}
          action={<PortfolioToTracker rows={syncRows} unassigned={sync.unassigned} snapshots={snapshotMap} />}
        >
          <ul className="mt-3 divide-y border-t sm:hidden">
            {alloc.rows.map((r) => (
              <li key={r.type} className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf.get(r.type) ?? OTHER_COLOR }} />
                    <span className="truncate">{r.type}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatPercent(r.share, 0)} dari total</span>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Modal</dt>
                    <dd className="truncate tabular-nums">{formatRupiah(r.principal)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Nilai</dt>
                    <dd className="truncate font-semibold tabular-nums">{formatRupiah(r.value)}</dd>
                  </div>
                  <div className="min-w-0 text-right">
                    <dt className="text-xs text-muted-foreground">Profit</dt>
                    <dd className={cn("font-medium tabular-nums", (r.profit ?? 0) < 0 ? "text-negative" : (r.profit ?? 0) > 0 && "text-positive")}>{formatPercent(r.profit, 2)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="mt-3 hidden overflow-x-auto border-t sm:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Jenis</th>
                  <th className="px-3 py-2.5 text-right font-medium">Modal</th>
                  <th className="px-3 py-2.5 text-right font-medium">Nilai</th>
                  <th className="px-3 py-2.5 text-right font-medium">Profit</th>
                  <th className="px-5 py-2.5 text-right font-medium">Alokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {alloc.rows.map((r) => (
                  <tr key={r.type}>
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="size-2.5 rounded-full" style={{ background: colorOf.get(r.type) ?? OTHER_COLOR }} />
                        {r.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatRupiah(r.principal)}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatRupiah(r.value)}</td>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums", (r.profit ?? 0) < 0 ? "text-negative" : (r.profit ?? 0) > 0 && "text-positive")}>
                      {formatPercent(r.profit, 2)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{formatPercent(r.share, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Untung / rugi per jenis" description="Persentase dari modal. Kanan = untung, kiri = rugi.">
        <PercentBars
          mode="diverging"
          rows={alloc.rows.map((r) => ({ name: r.type, ratio: r.profit, color: colorOf.get(r.type) ?? OTHER_COLOR }))}
        />
      </Panel>

      <PortfolioTable
        platforms={platforms.map((p) => ({ id: p.id, name: p.name }))}
        assetTypes={assetTypes.map((a) => ({ id: a.id, name: a.name, color: colorOf.get(a.name) }))}
        rows={investments.map((i) => ({
          id: i.id,
          platformId: i.platformId,
          platform: i.platform?.name ?? null,
          assetTypeId: i.assetTypeId,
          assetType: i.assetType?.name ?? null,
          description: i.description,
          principal: i.principal,
          currentValue: i.currentValue,
          profit: profitRatio(i.principal, i.currentValue),
          updatedAt: i.valueUpdatedAt?.toISOString() ?? null,
          color: i.assetType ? (colorOf.get(i.assetType.name) ?? OTHER_COLOR) : OTHER_COLOR,
        }))}
      />
    </div>
  );
}

async function TrackerTab({ assetTypes, colorOf }: { assetTypes: { id: number; name: string }[]; colorOf: Map<string, string> }) {
  const [cells, notes, settings] = await Promise.all([
    db.assetSnapshot.findMany(),
    db.assetMonthNote.findMany(),
    db.appSetting.findFirst(),
  ]);
  const current = toMonthKey(new Date());
  const used = [...new Set(cells.map((c) => c.month))].sort();
  const start = [addMonths(current, -11), ...used].sort()[0];
  const months: string[] = [];
  for (let m = start; m <= current; m = addMonths(m, 1)) months.push(m);
  const totals = assetMonthTotals(months, cells);

  return (
    <AssetTracker
      months={months}
      current={current}
      assetTypes={assetTypes.map((t) => ({ id: t.id, name: t.name, color: colorOf.get(t.name) ?? OTHER_COLOR }))}
      cells={cells.map((c) => ({ month: c.month, assetTypeId: c.assetTypeId, value: c.value }))}
      totals={Object.fromEntries(totals)}
      notes={Object.fromEntries(notes.map((n) => [n.month, n.note]))}
      dropBps={settings?.assetDropAlertBps ?? 3000}
    />
  );
}

async function TargetTab({ month, assetTypes, colorOf }: { month: string; assetTypes: { id: number; name: string }[]; colorOf: Map<string, string> }) {
  const prev = addMonths(month, -1);
  const [targets, snaps] = await Promise.all([
    db.portfolioTarget.findMany({ where: { month } }),
    db.assetSnapshot.findMany({ where: { month: { in: [month, prev] } } }),
  ]);
  const val = (m: string, id: number) => snaps.find((s) => s.month === m && s.assetTypeId === id)?.value ?? null;
  return (
    <PortfolioTargets
      month={month}
      rows={assetTypes.map((t) => {
        const now = val(month, t.id);
        const before = val(prev, t.id);
        return {
          assetTypeId: t.id,
          name: t.name,
          color: colorOf.get(t.name) ?? OTHER_COLOR,
          target: targets.find((x) => x.assetTypeId === t.id)?.amount ?? null,
          realized: now !== null && before !== null ? now - before : null,
          value: now,
        };
      })}
      prevLabel={formatMonth(prev)}
    />
  );
}

async function PhysicalTab() {
  const items = await db.physicalAsset.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard icon={Gem} tone="brand" label="Total aset fisik" value={formatRupiah(total)} />
        <StatCard icon={Landmark} label="Jumlah barang" value={`${items.length}`} />
      </div>
      <PhysicalAssets items={items.map((i) => ({ id: i.id, name: i.name, value: i.value, note: i.note }))} />
    </div>
  );
}
