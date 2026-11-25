import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, Panel } from "@/components/ui-kit";
import { addMonths, formatMonth, formatMonthLong, formatRupiah, toMonthKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAllPeriodSummaries } from "@/server/queries";
import { NewPeriodForm } from "./new-period-form";

export const metadata: Metadata = { title: "Bulanan" };

export default async function BulananPage() {
  const rows = (await getAllPeriodSummaries()).reverse();
  const existing = rows.map((r) => r.month);
  const current = toMonthKey(new Date());
  const latest = existing[0];
  const defaultMonth = !existing.includes(current) ? current : addMonths(latest ?? current, 1);

  const years = new Map<string, typeof rows>();
  for (const r of rows) years.set(r.month.slice(0, 4), [...(years.get(r.month.slice(0, 4)) ?? []), r]);

  return (
    <>
      <PageHeader title="Bulanan" description="Pilih bulan untuk input gaji dan transaksi." />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {rows.length === 0 && <EmptyState>Belum ada bulan. Buat bulan pertama lewat form di samping.</EmptyState>}
          {[...years.entries()].map(([year, list]) => (
            <section key={year}>
              <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted-foreground">{year}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((r) => {
                  const inflow = (r.summary.salary ?? 0) + r.summary.income;
                  const ratio = inflow > 0 ? Math.min(1, r.summary.expense / inflow) : 0;
                  const isCurrent = r.month === current;
                  return (
                    <li key={r.month}>
                      <Link
                        href={`/bulanan/${r.month}`}
                        className={cn(
                          "flex h-full flex-col gap-4 rounded-2xl border bg-card p-4 shadow-card transition-colors hover:border-ring/60 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                          isCurrent && "border-primary/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-center leading-none">
                              <span className="text-[13px] font-semibold">{formatMonth(r.month).split(" ")[0]}</span>
                              <span className="text-[11px] text-muted-foreground">{r.month.slice(2, 4)}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{formatMonthLong(r.month)}</div>
                              {isCurrent && <div className="text-xs font-medium text-primary">Bulan ini</div>}
                            </div>
                          </div>
                          <StatusBadge status={r.status} className="shrink-0" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Sisa</div>
                          <div className={cn("text-xl font-semibold tracking-tight tabular-nums", r.summary.sisa < 0 && "text-negative")}>
                            {formatRupiah(r.summary.sisa)}
                          </div>
                        </div>
                        <div className="mt-auto space-y-1.5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary/70" style={{ width: `${ratio * 100}%` }} />
                          </div>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                            <span>Keluar {formatRupiah(r.summary.expense)}</span>
                            <ChevronRight aria-hidden className="size-4 shrink-0" />
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <Panel title="Buat bulan baru" description="Satu bulan hanya bisa dibuat sekali." className="h-fit xl:sticky xl:top-10">
          <NewPeriodForm defaultMonth={defaultMonth} existing={existing} />
        </Panel>
      </div>
    </>
  );
}
