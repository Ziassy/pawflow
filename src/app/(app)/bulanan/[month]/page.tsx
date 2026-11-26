import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Clock, Sprout, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { CategoryDot, Panel } from "@/components/ui-kit";
import { SpendingDonut } from "@/components/charts";
import { formatBps, formatMonth, formatMonthLong, formatPercent, formatRupiah, isMonthKey } from "@/lib/format";
import { SAVINGS_CATEGORY, categoryTheme } from "@/lib/category-theme";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { getGoalOptions, getNameSuggestions, getPeriodDetail } from "@/server/queries";
import { PeriodControls } from "./period-controls";
import { SalaryEditor } from "./salary-editor";
import { QuickAdd, TransactionList } from "./transactions";

export async function generateMetadata({ params }: PageProps<"/bulanan/[month]">): Promise<Metadata> {
  const { month } = await params;
  return { title: isMonthKey(month) ? formatMonth(month) : "Bulanan" };
}

export default async function MonthPage({ params }: PageProps<"/bulanan/[month]">) {
  const { month } = await params;
  if (!isMonthKey(month)) notFound();
  const detail = await getPeriodDetail(month);
  if (!detail) notFound();
  const { period, categories, summary, status } = detail;

  const [prev, next, suggestions, goals] = await Promise.all([
    db.monthlyPeriod.findFirst({ where: { month: { lt: month } }, orderBy: { month: "desc" }, select: { month: true, salary: true } }),
    db.monthlyPeriod.findFirst({ where: { month: { gt: month } }, orderBy: { month: "asc" }, select: { month: true } }),
    getNameSuggestions(),
    getGoalOptions(),
  ]);

  const savings = summary.byCategory.find((b) => b.name === SAVINGS_CATEGORY);
  const inflow = (summary.salary ?? 0) + summary.income;
  const spentRatio = inflow > 0 ? Math.min(1, Math.max(0, summary.expense / inflow)) : 0;

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Navigasi bulan */}
      <div className="flex items-center justify-between gap-2">
        <NavArrow href={prev && `/bulanan/${prev.month}`} label={prev ? formatMonth(prev.month) : undefined} dir="prev" />
        <div className="text-center">
          <div className="text-[13px] font-medium text-muted-foreground">Bulanan</div>
          <h1 className="text-xl font-semibold md:text-2xl">{formatMonthLong(month)}</h1>
        </div>
        <NavArrow href={next && `/bulanan/${next.month}`} label={next ? formatMonth(next.month) : undefined} dir="next" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 md:gap-6">
        {/* Hero: sisa */}
        <section className="relative overflow-hidden rounded-3xl bg-linear-135 from-hero-from to-hero-to p-6 text-white shadow-card lg:col-span-2 md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(0.95 0.06 220), transparent 70%)" }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-white/85">
              <Wallet className="size-4" /> Sisa bulan ini
            </span>
            <StatusBadge status={status} />
          </div>
          <div
            className={cn(
              "relative mt-3 text-[28px] leading-none font-semibold tracking-tight sm:text-[34px] lg:text-5xl",
              summary.sisa < 0 && "text-red-100",
            )}
          >
            {formatRupiah(summary.sisa)}
          </div>
          <div className="relative mt-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${spentRatio * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-white/75">
              {inflow > 0 ? `${formatPercent(spentRatio, 0)} dari uang masuk sudah dialokasikan` : "Isi gaji untuk melihat alokasi"}
            </p>
          </div>
          <dl className="relative mt-5 grid grid-cols-1 gap-2.5 border-t border-white/20 pt-4 sm:mt-6 sm:grid-cols-3 sm:gap-3 sm:pt-5">
            <HeroStat
              icon={Wallet}
              label="Gaji"
              value={formatRupiah(summary.salary)}
              action={<SalaryEditor periodId={period.id} month={month} salary={period.salary} prev={prev} />}
            />
            <HeroStat icon={ArrowDownLeft} label="Pemasukan lain" value={formatRupiah(summary.income)} />
            <HeroStat icon={ArrowUpRight} label="Pengeluaran" value={formatRupiah(summary.expense)} />
          </dl>
        </section>

        {/* Tabungan & belum dibayar */}
        <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-1">
          <div className="rounded-2xl border bg-card p-4 shadow-card md:p-5">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="grid size-7 place-items-center rounded-full bg-positive-soft text-positive">
                <Sprout className="size-3.5" />
              </span>
              Porsi Masa Depan
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight lg:text-[22px]">{formatPercent(savings?.shareOfSalary ?? null, 1)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatRupiah(savings?.actual ?? 0)} · target {formatBps(savings?.targetBps ?? 0)} dari gaji
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-card md:p-5">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="grid size-7 place-items-center rounded-full bg-warning-soft text-warning">
                <Clock className="size-3.5" />
              </span>
              Belum dibayar
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight lg:text-[22px]">{formatRupiah(summary.unpaid)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {summary.unpaidCount} item
              {summary.missingAmountCount > 0 && (
                <span className="text-warning"> · {summary.missingAmountCount} tanpa nominal</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <PeriodControls periodId={period.id} month={month} salary={period.salary} isPlan={period.isPlan} note={period.note} />

      <div className="grid gap-5 lg:grid-cols-3 md:gap-6">
        <div className="space-y-5 lg:col-span-2 md:space-y-6">
          <Panel title="Tambah cepat" description="Ketik nominal seperti 50rb atau 1,5jt.">
            <QuickAdd periodId={period.id} categories={categories} suggestions={suggestions} />
          </Panel>
          <TransactionList
            periodId={period.id}
            transactions={period.transactions}
            categories={categories}
            suggestions={suggestions}
            goals={goals}
          />
        </div>

        <div className="space-y-5 md:space-y-6">
          <Panel title="Komposisi pengeluaran">
            <SpendingDonut
              total={summary.expense}
              data={summary.byCategory.map((b) => ({ name: b.name, value: b.actual, color: b.color }))}
            />
          </Panel>

          <Panel title="Budget vs target" description={summary.salary === null ? "Isi gaji untuk melihat target." : "Persentase dari gaji."}>
            <ul className="space-y-5">
              {summary.byCategory.map((b) => {
                const color = categoryTheme(b.name, b.color).color;
                const width = b.usage === null ? 0 : Math.min(100, b.usage * 100);
                return (
                  <li key={b.categoryId} className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <CategoryDot name={b.name} color={b.color} />
                        {b.name}
                      </span>
                      <span className={cn("font-medium tabular-nums", b.over && "text-negative")}>{formatRupiah(b.actual)}</span>
                    </div>
                    {b.target !== null ? (
                      <>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-secondary"
                          role="meter"
                          aria-valuenow={Math.round((b.usage ?? 0) * 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${b.name} terpakai`}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${width}%`, background: b.over ? "var(--negative)" : color }}
                          />
                        </div>
                        <div className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                          <span>
                            {formatPercent(b.shareOfSalary, 1)} / {formatBps(b.targetBps)}
                          </span>
                          <span className={cn(b.over && "font-medium text-negative")}>
                            {b.over ? `lebih ${formatRupiah(b.actual - b.target)}` : `sisa ${formatRupiah(b.target - b.actual)}`}
                          </span>
                        </div>
                      </>
                    ) : (
                      summary.salary !== null && (
                        <div className="text-xs text-muted-foreground">{formatPercent(b.shareOfSalary, 1)} dari gaji · tanpa target</div>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** Di HP: satu baris (label kiri, angka kanan). Mulai sm: tumpuk dalam 3 kolom. */
function HeroStat({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
      <dt className="flex min-w-0 items-center gap-1.5 text-xs text-white/80">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="flex shrink-0 items-center gap-2 sm:mt-1 sm:flex-col sm:items-start sm:gap-2">
        <span className="text-sm font-semibold tabular-nums whitespace-nowrap md:text-base">{value}</span>
        {action}
      </dd>
    </div>
  );
}

function NavArrow({ href, label, dir }: { href?: string | null; label?: string; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const cls = "flex h-10 min-w-10 items-center justify-center gap-1 rounded-control border bg-card px-2.5 text-sm shadow-card";
  if (!href)
    return (
      <span className={cn(cls, "invisible")} aria-hidden>
        <Icon className="size-4" />
      </span>
    );
  return (
    <Link href={href} className={cn(cls, "text-muted-foreground transition-colors hover:text-foreground")} aria-label={label}>
      {dir === "prev" && <Icon className="size-4" />}
      <span className="hidden sm:inline">{label}</span>
      {dir === "next" && <Icon className="size-4" />}
    </Link>
  );
}
