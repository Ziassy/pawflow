import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, Panel, StatCard } from "@/components/ui-kit";
import { MonthlyStackedBars } from "@/components/charts";
import { formatMonth, formatRupiah, toMonthKey } from "@/lib/format";
import { averageSisa } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getAllPeriodSummaries, getCategories } from "@/server/queries";

export const metadata: Metadata = { title: "Ringkasan Bulanan" };

export default async function RingkasanPage() {
  const [rows, categories] = await Promise.all([getAllPeriodSummaries(), getCategories()]);
  const expenseCats = categories.filter((c) => c.kind !== "INCOME");

  const years = new Map<string, typeof rows>();
  for (const r of rows) {
    const y = r.month.slice(0, 4);
    years.set(y, [...(years.get(y) ?? []), r]);
  }

  // KPI tahun berjalan (atau tahun terakhir yang ada)
  const thisYear = toMonthKey(new Date()).slice(0, 4);
  const kpiYear = years.has(thisYear) ? thisYear : [...years.keys()].at(-1);
  const yearRows = (kpiYear && years.get(kpiYear)) || [];
  const recorded = yearRows.filter((r) => r.status === "Tercatat");
  const sum = (f: (r: (typeof rows)[number]) => number) => recorded.reduce((s, r) => s + f(r), 0);
  const avg = averageSisa(yearRows.map((r) => ({ status: r.status, sisa: r.summary.sisa })));

  const chartMonths = rows.slice(-12).map((r) => ({
    month: r.month,
    isPlan: r.status === "Rencana",
    values: Object.fromEntries(r.summary.byCategory.map((b) => [b.name, b.actual])),
  }));

  const th = "px-3 py-3 text-right font-medium whitespace-nowrap";
  const td = "px-3 py-3 text-right tabular-nums whitespace-nowrap";

  return (
    <>
      <PageHeader
        title="Ringkasan Bulanan"
        description="Semua angka dihitung dari transaksi. Rata-rata sisa hanya dari bulan berstatus Tercatat."
      />
      {rows.length === 0 ? (
        <EmptyState>Belum ada data.</EmptyState>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard icon={Wallet} label={`Gaji ${kpiYear}`} value={formatRupiah(sum((r) => r.summary.salary ?? 0))} hint={`${recorded.length} bulan tercatat`} />
            <StatCard icon={ArrowDownLeft} tone="positive" label="Pemasukan lain" value={formatRupiah(sum((r) => r.summary.income))} />
            <StatCard icon={ArrowUpRight} tone="negative" label="Total keluar" value={formatRupiah(sum((r) => r.summary.expense))} />
            <StatCard icon={PiggyBank} tone="brand" label="Rata-rata sisa" value={formatRupiah(avg)} hint="per bulan tercatat" />
          </div>

          <Panel title="Pengeluaran per bulan" description="12 bulan terakhir, bertumpuk per kategori.">
            <MonthlyStackedBars months={chartMonths} categories={expenseCats} />
          </Panel>

          <Panel padded={false} title="Tabel per bulan" className="overflow-hidden">
            {/* HP: satu kartu per bulan; tabel lebar mulai 640px */}
            <div className="mt-3 divide-y border-t sm:hidden">
              {[...years.entries()].map(([year, list]) => {
                const yAvg = averageSisa(list.map((r) => ({ status: r.status, sisa: r.summary.sisa })));
                const counted = list.filter((r) => r.status === "Tercatat").length;
                return (
                  <section key={year}>
                    <ul className="divide-y">
                      {list.map((r) => (
                        <li key={r.month} className={cn("space-y-2.5 px-4 py-3", r.status === "Rencana" && "text-muted-foreground")}>
                          <div className="flex items-center justify-between gap-3">
                            <Link href={`/bulanan/${r.month}`} className="-my-2 inline-flex min-h-9 items-center text-sm font-semibold text-foreground hover:underline">
                              {formatMonth(r.month)}
                            </Link>
                            <StatusBadge status={r.status} className="shrink-0" />
                          </div>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            {[
                              ["Gaji", formatRupiah(r.summary.salary)],
                              ["Pemasukan", formatRupiah(r.summary.income)],
                              ...expenseCats.map((c) => [c.name, formatRupiah(r.summary.byCategory.find((b) => b.categoryId === c.id)?.actual ?? 0)]),
                              ["Total keluar", formatRupiah(r.summary.expense)],
                            ].map(([k, v]) => (
                              <div key={k} className="min-w-0">
                                <dt className="truncate text-xs text-muted-foreground">{k}</dt>
                                <dd className="tabular-nums">{v}</dd>
                              </div>
                            ))}
                          </dl>
                          <div className="flex items-center justify-between border-t pt-2 text-sm">
                            <span className="text-xs text-muted-foreground">Sisa</span>
                            <span className={cn("font-semibold tabular-nums", r.summary.sisa < 0 && "text-negative")}>{formatRupiah(r.summary.sisa)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between gap-3 bg-secondary/50 px-4 py-3 text-sm font-medium">
                      <span>
                        Rata-rata sisa {year}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">({counted} bln tercatat)</span>
                      </span>
                      <span className={cn("shrink-0 tabular-nums", (yAvg ?? 0) < 0 && "text-negative")}>{formatRupiah(yAvg)}</span>
                    </div>
                  </section>
                );
              })}
            </div>
            <div className="mt-4 hidden overflow-x-auto border-t sm:block">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="sticky left-0 bg-secondary px-4 py-3 text-left font-medium">Bulan</th>
                    <th className="px-3 py-3 text-left font-medium">Status</th>
                    <th className={th}>Gaji</th>
                    <th className={th}>Pemasukan</th>
                    {expenseCats.map((c) => (
                      <th key={c.id} className={th}>
                        {c.name}
                      </th>
                    ))}
                    <th className={th}>Total keluar</th>
                    <th className={cn(th, "pr-5")}>Sisa</th>
                  </tr>
                </thead>
                {[...years.entries()].map(([year, list]) => {
                  const yAvg = averageSisa(list.map((r) => ({ status: r.status, sisa: r.summary.sisa })));
                  const counted = list.filter((r) => r.status === "Tercatat").length;
                  return (
                    <tbody key={year} className="divide-y border-b">
                      {list.map((r) => (
                        <tr key={r.month} className={cn("transition-colors hover:bg-secondary/40", r.status === "Rencana" && "text-muted-foreground")}>
                          <td className="sticky left-0 bg-card px-4 py-3 font-medium whitespace-nowrap">
                            <Link href={`/bulanan/${r.month}`} className="-my-2 inline-block py-2 hover:underline">
                              {formatMonth(r.month)}
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className={td}>{formatRupiah(r.summary.salary)}</td>
                          <td className={td}>{formatRupiah(r.summary.income)}</td>
                          {expenseCats.map((c) => (
                            <td key={c.id} className={td}>
                              {formatRupiah(r.summary.byCategory.find((b) => b.categoryId === c.id)?.actual ?? 0)}
                            </td>
                          ))}
                          <td className={cn(td, "font-medium")}>{formatRupiah(r.summary.expense)}</td>
                          <td className={cn(td, "pr-5 font-semibold", r.summary.sisa < 0 && "text-negative")}>{formatRupiah(r.summary.sisa)}</td>
                        </tr>
                      ))}
                      <tr className="bg-secondary/50 font-medium">
                        <td className="sticky left-0 bg-secondary px-4 py-3 whitespace-nowrap" colSpan={2}>
                          Rata-rata sisa {year}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">({counted} bln tercatat)</span>
                        </td>
                        <td colSpan={expenseCats.length + 3} />
                        <td className={cn(td, "pr-5", (yAvg ?? 0) < 0 && "text-negative")}>{formatRupiah(yAvg)}</td>
                      </tr>
                    </tbody>
                  );
                })}
              </table>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
