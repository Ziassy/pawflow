import type { Metadata } from "next";
import { CalendarCheck, CreditCard, HandCoins, Landmark, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState, HeroCard, Panel, StatCard, TabLinks } from "@/components/ui-kit";
import { db } from "@/lib/db";
import { addMonths, formatMonth, formatRupiah, isMonthKey, toMonthKey } from "@/lib/format";
import { ledger, overallPayoff, projectDebt, sortByAmountDesc, summarizeReceivable } from "@/lib/debt";
import { DebtGrid, DebtList } from "./debts";
import { PersonalDebts, type PersonalDebtItem } from "./personal-debts";
import { Receivables, type ReceivableItem } from "./receivables";

export const metadata: Metadata = { title: "Hutang & Piutang" };

const TABS = [
  { key: "kartu", label: "Kartu & cicilan", href: "/hutang" },
  { key: "orang", label: "Hutang", href: "/hutang?tab=orang" },
  { key: "piutang", label: "Piutang", href: "/hutang?tab=piutang" },
];

export default async function HutangPage({ searchParams }: PageProps<"/hutang">) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : "kartu";

  return (
    <>
      <PageHeader title="Hutang & Piutang" description="Saldo hutang, rencana pelunasan, dan jadwal piutang." />
      <TabLinks tabs={TABS} active={tab} />
      {tab === "kartu" && <CardsTab from={typeof sp.dari === "string" && isMonthKey(sp.dari) ? sp.dari : null} to={typeof sp.sampai === "string" && isMonthKey(sp.sampai) ? sp.sampai : null} />}
      {tab === "orang" && <PersonalTab />}
      {tab === "piutang" && <ReceivableTab />}
    </>
  );
}

async function CardsTab({ from, to }: { from: string | null; to: string | null }) {
  const debts = await db.debt.findMany({
    where: { kind: { not: "PRIBADI" } },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { snapshots: true, plans: true },
  });
  const current = toMonthKey(new Date());
  // Urut saldo terbesar dulu; lunas/kosong di bawah (kolom tabel ikut urutan ini)
  const projections = sortByAmountDesc(
    debts.map((d) => ({ debt: d, p: projectDebt(d.snapshots, d.plans) })),
    (x) => (x.debt.active ? x.p.balance : 0),
  );
  const sortedDebts = projections.map((x) => x.debt);
  const active = projections.filter((x) => x.debt.active);
  const totalBalance = active.reduce((s, x) => s + (x.p.balance ?? 0), 0);
  const totalPlanned = active.reduce((s, x) => s + x.p.plannedTotal, 0);
  const totalRemaining = active.reduce((s, x) => s + (x.p.remainingAfterPlan ?? 0), 0);
  const payoff = overallPayoff(active.map((x) => x.p));
  const unplanned = active.filter((x) => x.p.balance !== null && x.p.balance > 0 && !x.p.payoffMonth).length;

  // Rentang bulan grid: bawaan 2 bln lalu s.d. 12 bln ke depan; bisa diperluas lewat ?dari= & ?sampai=.
  // Bulan yang sudah berisi data selalu ikut tampil.
  const allMonths = debts.flatMap((d) => [...d.snapshots.map((s) => s.month), ...d.plans.map((p) => p.month)]);
  const defaultFrom = [addMonths(current, -2), ...allMonths].sort()[0];
  const defaultTo = [addMonths(current, 12), ...allMonths].sort().at(-1)!;
  const start = [from ?? defaultFrom, ...allMonths].sort()[0];
  let end = [to ?? defaultTo, ...allMonths].sort().at(-1)!;
  if (end < start) end = start;
  // Batas aman: maksimal 10 tahun ditampilkan sekaligus
  if (addMonths(start, 119) < end) end = addMonths(start, 119);
  const months: string[] = [];
  for (let m = start; m <= end; m = addMonths(m, 1)) months.push(m);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-3">
        <HeroCard
          className="lg:col-span-2"
          label={
            <>
              <CreditCard className="size-4" /> Total hutang kartu & cicilan
            </>
          }
          value={formatRupiah(totalBalance)}
        >
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/20 pt-5 text-sm">
            <div>
              <dt className="text-xs text-white/75">Total rencana bayar</dt>
              <dd className="mt-1 font-semibold">{formatRupiah(totalPlanned)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/75">Sisa setelah rencana</dt>
              <dd className="mt-1 font-semibold">{formatRupiah(totalRemaining)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/75">Perkiraan lunas</dt>
              <dd className="mt-1 font-semibold">{payoff ? formatMonth(payoff) : unplanned ? "Belum terencana" : "–"}</dd>
            </div>
          </dl>
        </HeroCard>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-5">
          <StatCard icon={TrendingDown} tone="brand" label="Kartu aktif" value={`${active.length}`} hint={`${debts.length - active.length} nonaktif`} />
          <StatCard
            icon={CalendarCheck}
            tone={unplanned ? "negative" : "positive"}
            label="Belum ada rencana lunas"
            value={`${unplanned}`}
            hint={unplanned ? "Tambah rencana bayar di tabel" : "Semua sudah terencana"}
          />
        </div>
      </div>

      <DebtList
        debts={projections.map(({ debt, p }) => ({
          id: debt.id,
          name: debt.name,
          kind: debt.kind,
          note: debt.note,
          active: debt.active,
          balance: p.balance,
          baseMonth: p.baseMonth,
          remaining: p.remainingAfterPlan,
          payoffMonth: p.payoffMonth,
          paidOff: p.paidOff,
        }))}
      />

      {debts.length > 0 ? (
        <Panel padded={false} title="Saldo & rencana per bulan" description="Klik sel untuk mengisi. Kosong berarti belum ada data, bukan 0. Rencana bayar ikut mengisi item bulanan yang terhubung di Pengaturan > Template item rutin.">
          <DebtGrid
            months={months}
            current={current}
            range={{ from: start, to: end, isDefault: !from && !to }}
            debts={sortedDebts.map((d) => ({
              id: d.id,
              name: d.name,
              snapshots: Object.fromEntries(d.snapshots.map((s) => [s.month, s.balance])),
              plans: Object.fromEntries(d.plans.map((p) => [p.month, { id: p.id, amount: p.amount, paid: p.paid }])),
            }))}
          />
        </Panel>
      ) : (
        <EmptyState>Belum ada kartu/cicilan. Tambahkan lewat tombol di atas.</EmptyState>
      )}
    </div>
  );
}

async function PersonalTab() {
  const debts = await db.debt.findMany({
    where: { kind: "PRIBADI" },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { entries: true, plans: { orderBy: { month: "asc" } } },
  });
  const current = toMonthKey(new Date());
  const items: PersonalDebtItem[] = debts.map((d) => {
    const base = { id: d.id, name: d.name, dueDay: d.dueDay, note: d.note };
    if (d.repayment === "CICILAN") {
      return {
        ...base,
        repayment: "CICILAN" as const,
        principal: d.principal,
        installmentCount: d.installmentCount,
        installmentAmount: d.installmentAmount,
        startMonth: d.startMonth ?? current,
        summary: summarizeReceivable(d.principal, d.plans),
        installments: d.plans.map((p, i) => ({ id: p.id, seq: i + 1, month: p.month, amount: p.amount, paid: p.paid })),
      };
    }
    const l = ledger(d.entries);
    return {
      ...base,
      repayment: "BEBAS" as const,
      borrowed: l.totalDebit,
      paid: l.totalCredit,
      balance: l.balance,
      rows: l.rows.map((x) => ({ ...x, date: new Date(x.date).toISOString() })),
    };
  });
  const remaining = (it: PersonalDebtItem) => (it.repayment === "BEBAS" ? it.balance : it.summary.remaining);
  const total = items.reduce((s, it) => s + Math.max(0, remaining(it)), 0);
  const dueThisMonth = debts.filter((d) => d.repayment === "CICILAN").flatMap((d) => d.plans).filter((p) => p.month === current && !p.paid);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard icon={Landmark} tone="negative" label="Total hutang" value={formatRupiah(total)} hint={`${items.length} orang`} />
        <StatCard
          icon={CalendarCheck}
          tone={dueThisMonth.length ? "negative" : "neutral"}
          label="Cicilan bulan ini"
          value={formatRupiah(dueThisMonth.reduce((s, p) => s + p.amount, 0))}
          hint={`${dueThisMonth.length} belum dibayar`}
        />
      </div>
      <PersonalDebts current={current} items={sortByAmountDesc(items, remaining)} />
    </div>
  );
}

async function ReceivableTab() {
  const list = await db.receivable.findMany({
    orderBy: { createdAt: "asc" },
    include: { installments: { orderBy: { seq: "asc" } }, entries: true },
  });
  const current = toMonthKey(new Date());
  const items: ReceivableItem[] = list.map((r) => {
    const base = { id: r.id, name: r.name, dueDay: r.dueDay, note: r.note };
    if (r.kind === "BEBAS") {
      const l = ledger(r.entries);
      return {
        ...base,
        kind: "BEBAS" as const,
        lent: l.totalDebit,
        paid: l.totalCredit,
        balance: l.balance,
        rows: l.rows.map((x) => ({ ...x, date: new Date(x.date).toISOString() })),
      };
    }
    return {
      ...base,
      kind: "CICILAN" as const,
      principal: r.principal,
      installmentCount: r.installmentCount,
      installmentAmount: r.installmentAmount,
      startMonth: r.startMonth ?? current,
      summary: summarizeReceivable(r.principal, r.installments),
      installments: r.installments.map((i) => ({ id: i.id, seq: i.seq, month: i.month, amount: i.amount, paid: i.paid })),
    };
  });
  const totals = items.reduce(
    (a, it) =>
      it.kind === "BEBAS"
        ? { lent: a.lent + it.lent, profit: a.profit, remaining: a.remaining + it.balance }
        : { lent: a.lent + it.principal, profit: a.profit + it.summary.profit, remaining: a.remaining + it.summary.remaining },
    { lent: 0, profit: 0, remaining: 0 },
  );
  const dueThisMonth = list.flatMap((r) => r.installments).filter((i) => i.month === current && !i.paid);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard icon={Landmark} tone="brand" label="Sisa piutang" value={formatRupiah(totals.remaining)} hint={`${items.length} orang`} />
        <StatCard icon={HandCoins} label="Total dipinjamkan" value={formatRupiah(totals.lent)} />
        <StatCard icon={TrendingDown} tone="positive" label="Keuntungan (cicilan)" value={formatRupiah(totals.profit)} />
        <StatCard
          icon={CalendarCheck}
          tone={dueThisMonth.length ? "negative" : "neutral"}
          label="Jatuh tempo bulan ini"
          value={formatRupiah(dueThisMonth.reduce((s, i) => s + i.amount, 0))}
          hint={`${dueThisMonth.length} cicilan`}
        />
      </div>
      <Receivables current={current} items={sortByAmountDesc(items, (it) => (it.kind === "BEBAS" ? it.balance : it.summary.remaining))} />
    </div>
  );
}
