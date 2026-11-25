import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CreditCard, Landmark, Minus, PiggyBank, Sparkles, Sprout, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState, Panel, Progress } from "@/components/ui-kit";
import { CashflowChart, Donut, MultiLine, PercentBars, SeriesStackedBars, SingleBars } from "@/components/charts";
import { db } from "@/lib/db";
import { addMonths, formatMonth, formatMonthLong, formatPercent, formatRupiah, isMonthKey, toMonthKey } from "@/lib/format";
import { averageSisa } from "@/lib/money";
import { debtTotalsByMonth, latestSnapshot, overallPayoff, projectDebt } from "@/lib/debt";
import { delta, summarySentence, type Delta } from "@/lib/dashboard";
import { SAVINGS_CATEGORY, categoryTheme, seriesColor } from "@/lib/category-theme";
import { cn } from "@/lib/utils";
import { getAllPeriodSummaries, getCategories } from "@/server/queries";
import { getGoalsView } from "@/server/goals";
import { MonthPicker } from "./month-picker";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const ref = typeof sp.bulan === "string" && isMonthKey(sp.bulan) ? sp.bulan : toMonthKey(new Date());
  const prev = addMonths(ref, -1);

  const [periods, categories, assetTypes, snapshots, debts, goalsView] = await Promise.all([
    getAllPeriodSummaries(),
    getCategories(),
    db.assetType.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    db.assetSnapshot.findMany(),
    db.debt.findMany({ where: { kind: { not: "PRIBADI" } }, include: { snapshots: true, plans: true } }),
    getGoalsView(),
  ]);

  const byMonth = new Map(periods.map((p) => [p.month, p]));
  const P = byMonth.get(ref);
  const Q = byMonth.get(prev);
  const savingsShare = (p?: (typeof periods)[number]) => p?.summary.byCategory.find((b) => b.name === SAVINGS_CATEGORY)?.shareOfSalary ?? null;

  // Aset finansial per bulan (null = bulan kosong, bukan 0)
  const assetTotal = (m: string) => {
    const cells = snapshots.filter((s) => s.month === m);
    return cells.length ? cells.reduce((s, c) => s + c.value, 0) : null;
  };
  // Hutang kartu per bulan: saldo terakhir ≤ bulan itu per kartu
  const debtAt = (m: string) => {
    const vals = debts.map((d) => latestSnapshot(d.snapshots, m)?.balance ?? null).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  };
  const payoff = overallPayoff(debts.filter((d) => d.active).map((d) => projectDebt(d.snapshots, d.plans, ref)));

  // Kalimat ringkasan
  const withSalary = periods.filter((p) => p.summary.salary !== null && p.month <= ref);
  const year = ref.slice(0, 4);
  const avg = averageSisa(periods.filter((p) => p.month.startsWith(year)).map((p) => ({ status: p.status, sisa: p.summary.sisa })));
  const sentence = summarySentence({
    firstSalary: withSalary[0] ? { month: withSalary[0].month, value: withSalary[0].summary.salary! } : null,
    refSalary: withSalary.at(-1) ? { month: withSalary.at(-1)!.month, value: withSalary.at(-1)!.summary.salary! } : null,
    avgSisa: avg !== null ? { year, value: avg, months: periods.filter((p) => p.month.startsWith(year) && p.status === "Tercatat").length } : null,
    debtTotal: debtAt(ref),
    debtPayoff: payoff,
  });

  const kpis: KpiProps[] = [
    { label: "Gaji", icon: Wallet, value: P?.summary.salary ?? null, d: delta(P?.summary.salary ?? null, Q?.summary.salary ?? null), goodUp: true },
    { label: "Total aset finansial", icon: PiggyBank, value: assetTotal(ref), d: delta(assetTotal(ref), assetTotal(prev)), goodUp: true, emptyHint: "Asset Tracker kosong" },
    { label: "Total hutang kartu", icon: CreditCard, value: debtAt(ref), d: delta(debtAt(ref), debtAt(prev)), goodUp: false },
    {
      label: "Porsi Masa Depan",
      icon: Sprout,
      value: savingsShare(P),
      percent: true,
      d: savingsShare(P) !== null && savingsShare(Q) !== null ? { diff: savingsShare(P)! - savingsShare(Q)!, ratio: null } : null,
      goodUp: true,
    },
    { label: "Sisa bulan ini", icon: Landmark, value: P?.summary.sisa ?? null, d: delta(P?.summary.sisa ?? null, Q?.summary.sisa ?? null), goodUp: true },
  ];

  // Grafik arus kas: 12 bulan s.d. acuan + bulan Rencana setelahnya (maks 6)
  const flowMonths = periods.filter((p) => p.month > addMonths(ref, -12) && p.month <= addMonths(ref, 6));
  const expenseCats = categories.filter((c) => c.kind !== "INCOME");

  // Aset per jenis per bulan (bulan yang ada isinya)
  const assetMonths = [...new Set(snapshots.map((s) => s.month))].filter((m) => m <= ref).sort().slice(-12);
  const usedTypes = assetTypes.filter((t) => snapshots.some((s) => s.assetTypeId === t.id)).map((t, i) => ({ t, color: seriesColor(i) }));
  const assetData = assetMonths.map((m) => ({
    month: m,
    ...Object.fromEntries(usedTypes.map(({ t }) => [`t${t.id}`, snapshots.find((s) => s.month === m && s.assetTypeId === t.id)?.value ?? 0])),
  }));

  const debtSeries = debtTotalsByMonth(debts.map((d) => d.snapshots)).filter((x) => x.month <= addMonths(ref, 12)).slice(-18);
  const salaryJourney = periods
    .filter((p) => p.month <= ref && p.summary.salary !== null)
    .map((p) => ({ month: p.month, gaji: p.summary.salary, keluar: p.status === "Rencana" ? null : p.summary.expense }));

  // ---- Persentase
  const inflowRef = P ? (P.summary.salary ?? 0) + P.summary.income : 0;
  const budgetRows = (P?.summary.byCategory ?? [])
    .filter((b) => b.target !== null)
    .map((b) => ({
      name: b.name,
      ratio: b.usage,
      color: categoryTheme(b.name, b.color).color,
      hint: `${formatRupiah(b.actual)} dari ${formatRupiah(b.target)}`,
    }));
  const savingsTarget = (categories.find((c) => c.name === SAVINGS_CATEGORY)?.targetBps ?? 0) / 10000;
  const ratioTrend = periods
    .filter((p) => p.status === "Tercatat" && p.month <= ref)
    .slice(-12)
    .map((p) => {
      const inflow = (p.summary.salary ?? 0) + p.summary.income;
      return { month: p.month, tabung: savingsShare(p), sisa: inflow > 0 ? p.summary.sisa / inflow : null };
    });
  const assetRefMonth = [...new Set(snapshots.map((x) => x.month))].filter((m) => m <= ref).sort().at(-1) ?? null;
  const assetDonut = assetRefMonth
    ? usedTypes
        .map(({ t, color }) => ({ name: t.name, value: snapshots.find((x) => x.month === assetRefMonth && x.assetTypeId === t.id)?.value ?? 0, fill: color }))
        .filter((d) => d.value > 0)
    : [];

  return (
    <>
      <PageHeader
        eyebrow={<span className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-primary" /> Ringkasan keuangan</span>}
        title={formatMonthLong(ref)}
        description={`Dibanding ${formatMonth(prev)}.`}
        actions={<MonthPicker value={ref} />}
      />

      {periods.length === 0 ? (
        <EmptyState>
          Belum ada data. Mulai dari <Link href="/bulanan" className="font-medium text-primary">Bulanan</Link> atau jalankan <code>npm run import</code>.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-linear-135 from-hero-from to-hero-to p-6 text-white shadow-card md:p-7">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.95 0.06 220), transparent 70%)" }} />
            <p className="relative max-w-3xl text-sm leading-relaxed font-medium sm:text-base lg:text-lg">{sentence}</p>
            {!P && <p className="relative mt-2 text-sm text-white/80">{formatMonth(ref)} belum dibuat di Bulanan.</p>}
          </section>

          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
            {kpis.map((k) => (
              <Kpi key={k.label} {...k} prevLabel={formatMonth(prev)} />
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3 md:gap-6">
            <Panel title="Alokasi uang masuk" description={P ? `Gaji + pemasukan ${formatMonth(ref)} = 100%` : "Bulan belum dibuat"}>
              {P && inflowRef > 0 ? (
                <Donut
                  total={inflowRef}
                  centerLabel="Uang masuk"
                  empty="Belum ada data."
                  data={[
                    ...P.summary.byCategory.map((b) => ({ name: b.name, value: b.actual, fill: categoryTheme(b.name, b.color).color })),
                    ...(P.summary.sisa > 0 ? [{ name: "Sisa", value: P.summary.sisa, fill: "#94a3b8" }] : []),
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Isi gaji bulan ini untuk melihat alokasi.</p>
              )}
            </Panel>
            <Panel title="Budget terpakai" description="Aktual ÷ target per kategori. Garis = 100%.">
              {P && budgetRows.length ? (
                <PercentBars rows={budgetRows} />
              ) : (
                <p className="text-sm text-muted-foreground">Isi gaji & target kategori di Pengaturan.</p>
              )}
            </Panel>
            <Panel title="Alokasi aset finansial" description={assetRefMonth ? `Per jenis, ${formatMonth(assetRefMonth)}` : "Asset Tracker kosong"}>
              <Donut total={assetDonut.reduce((s, d) => s + d.value, 0)} centerLabel="Total aset" empty="Isi Asset Tracker dulu." data={assetDonut} />
            </Panel>
          </div>

          <Panel title="Tren persentase" description="Porsi Masa Depan dari gaji dan sisa dari uang masuk, 12 bulan tercatat terakhir.">
            {ratioTrend.length > 1 ? (
              <MultiLine
                percent
                data={ratioTrend}
                refLine={{ value: savingsTarget, label: `Target Masa Depan ${formatPercent(savingsTarget, 0)}` }}
                series={[
                  { key: "tabung", name: "Porsi Masa Depan", color: "#1baf7a" },
                  { key: "sisa", name: "Sisa dari uang masuk", color: "#2a78d6" },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Butuh minimal 2 bulan tercatat.</p>
            )}
          </Panel>

          <Panel title="Arus kas bulanan" description="Pengeluaran per kategori vs gaji + uang masuk. Bulan Rencana tampil transparan.">
            {flowMonths.length ? (
              <CashflowChart
                categories={expenseCats}
                months={flowMonths.map((p) => ({
                  month: p.month,
                  isPlan: p.status === "Rencana",
                  inflow: (p.summary.salary ?? 0) + p.summary.income,
                  values: Object.fromEntries(p.summary.byCategory.map((b) => [b.name, b.actual])),
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada bulan di rentang ini.</p>
            )}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2 md:gap-6">
            <Panel title="Aset finansial per bulan" description="Bertumpuk per jenis, dari Asset Tracker.">
              {assetData.length ? (
                <SeriesStackedBars data={assetData} series={usedTypes.map(({ t, color }) => ({ key: `t${t.id}`, name: t.name, color }))} />
              ) : (
                <p className="text-sm text-muted-foreground">Asset Tracker belum diisi.</p>
              )}
            </Panel>
            <Panel title="Hutang kartu per bulan" description={payoff ? `Estimasi lunas ${formatMonth(payoff)}` : "Tambah rencana bayar untuk estimasi lunas."}>
              {debtSeries.length ? <SingleBars data={debtSeries.map((d) => ({ month: d.month, value: d.total }))} name="Total hutang" color="#eb6834" height={256} /> : <p className="text-sm text-muted-foreground">Belum ada saldo hutang.</p>}
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-3 md:gap-6">
            <Panel title="Perjalanan gaji vs pengeluaran" description="Pengeluaran tercatat (tanpa bulan Rencana)." className="lg:col-span-2">
              {salaryJourney.length > 1 ? (
                <MultiLine
                  data={salaryJourney}
                  series={[
                    { key: "gaji", name: "Gaji", color: "#2a78d6" },
                    { key: "keluar", name: "Pengeluaran tercatat", color: "#eb6834" },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Butuh minimal 2 bulan bergaji.</p>
              )}
            </Panel>
            <Panel
              title="Progres target"
              action={
                <Link href="/target" className="-my-1.5 inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-primary hover:bg-accent sm:min-h-0 sm:py-1.5">
                  Semua
                </Link>
              }
            >
              {goalsView.goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada target.</p>
              ) : (
                <ul className="space-y-4">
                  {goalsView.goals.slice(0, 6).map((g) => (
                    <li key={g.id}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{g.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatPercent(g.fire.progress, 0)}</span>
                      </div>
                      <Progress className="mt-1.5" value={g.fire.progress} color={g.fire.progress === 1 ? "var(--positive)" : undefined} label={g.name} />
                      <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {formatRupiah(g.collected)} / {formatRupiah(g.target)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

type KpiProps = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number | null;
  d: Delta | null;
  goodUp: boolean;
  percent?: boolean;
  emptyHint?: string;
};

function Kpi({ label, icon: Icon, value, d, goodUp, percent, emptyHint, prevLabel }: KpiProps & { prevLabel: string }) {
  const fmt = (v: number) => (percent ? formatPercent(v, 1) : formatRupiah(v));
  const up = d && d.diff > 0;
  const flat = !d || d.diff === 0;
  const good = d && !flat && (up ? goodUp : !goodUp);
  const DeltaIcon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card last:col-span-2 lg:last:col-span-1">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span className="grid size-7 place-items-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-3.5" />
        </span>
        {label}
      </div>
      <div className={cn("mt-2 text-xl font-semibold tracking-tight", value !== null && value < 0 && "text-negative")}>
        {value === null ? <span className="text-muted-foreground">–</span> : fmt(value)}
      </div>
      <div
        className={cn(
          "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          !d ? "bg-secondary text-muted-foreground" : flat ? "bg-secondary text-muted-foreground" : good ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
        )}
        title={`vs ${prevLabel}`}
      >
        <DeltaIcon className="size-3" />
        {!d
          ? value === null && emptyHint
            ? emptyHint
            : "Tidak ada pembanding"
          : percent
            ? `${d.diff > 0 ? "+" : ""}${(d.diff * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })} poin`
            : `${d.diff > 0 ? "+" : ""}${formatRupiah(d.diff)}`}
      </div>
    </div>
  );
}
