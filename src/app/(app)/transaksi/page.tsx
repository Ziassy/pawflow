import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CircleAlert, ListFilter } from "lucide-react";
import { StatCard } from "@/components/ui-kit";
import { Dropdown } from "@/components/dropdown";
import { categoryTheme } from "@/lib/category-theme";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatMonth, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getCategories, getGoalOptions, getNameSuggestions } from "@/server/queries";
import { findTransactions, parseTxFilter } from "@/server/transactions-filter";
import { TransactionTable } from "./transaction-table";

export const metadata: Metadata = { title: "Transaksi" };

export default async function TransaksiPage({ searchParams }: PageProps<"/transaksi">) {
  const sp = await searchParams;
  const filter = parseTxFilter(sp);
  const [rows, categories, months, suggestions, goals] = await Promise.all([
    findTransactions(filter),
    getCategories(),
    db.monthlyPeriod.findMany({ orderBy: { month: "desc" }, select: { month: true } }),
    getNameSuggestions(),
    getGoalOptions(),
  ]);

  let expense = 0;
  let income = 0;
  let missing = 0;
  for (const r of rows) {
    if (r.amount === null) missing++;
    else if (r.category.kind === "INCOME") income += r.amount;
    else expense += r.amount;
  }

  const qs = new URLSearchParams(
    Object.entries({
      q: filter.q,
      bulan: filter.month,
      kategori: filter.category?.toString(),
      dibayar: filter.paid,
    }).filter((e): e is [string, string] => !!e[1]),
  ).toString();


  return (
    <>
      <PageHeader
        title="Transaksi"
        description="Semua transaksi. Klik baris untuk edit."
      />

      <Form className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3 shadow-card sm:grid-cols-3 xl:grid-cols-[1fr_auto_auto_auto_auto] xl:items-center" action="/transaksi">
        <input
          name="q"
          defaultValue={filter.q}
          placeholder="Cari nama / catatan"
          aria-label="Cari"
          className="col-span-2 h-11 rounded-control border bg-background px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:col-span-3 xl:col-span-1 xl:h-10 xl:text-sm"
        />
        <Dropdown
          name="bulan"
          aria-label="Bulan"
          emptyLabel="Semua bulan"
          value={filter.month ?? null}
          className="h-11 xl:h-10 xl:w-40"
          options={months.map((m) => ({ value: m.month, label: formatMonth(m.month) }))}
        />
        <Dropdown
          name="kategori"
          aria-label="Kategori"
          emptyLabel="Semua kategori"
          value={filter.category ? String(filter.category) : null}
          className="h-11 xl:h-10 xl:w-44"
          options={categories.map((c) => ({ value: String(c.id), label: c.name, color: categoryTheme(c.name, c.color).color }))}
        />
        <Dropdown
          name="dibayar"
          aria-label="Status bayar"
          emptyLabel="Semua status"
          value={filter.paid ?? null}
          className="h-11 xl:h-10 xl:w-40"
          options={[
            { value: "ya", label: "Sudah dibayar", color: "var(--positive)" },
            { value: "belum", label: "Belum dibayar", color: "var(--warning)" },
          ]}
        />
        <div className="col-span-2 flex gap-2 sm:col-span-3 xl:col-span-1">
          <button type="submit" className={cn(buttonVariants(), "h-11 flex-1 rounded-control xl:h-10")}>
            Terapkan
          </button>
          {qs && (
            <Link href="/transaksi" className={cn(buttonVariants({ variant: "ghost" }), "h-10")}>
              Reset
            </Link>
          )}
        </div>
      </Form>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard icon={ListFilter} label="Hasil filter" value={`${rows.length} transaksi`} />
        <StatCard icon={ArrowUpRight} tone="negative" label="Pengeluaran" value={formatRupiah(expense)} />
        <StatCard icon={ArrowDownLeft} tone="positive" label="Pemasukan" value={formatRupiah(income)} />
        <StatCard
          icon={CircleAlert}
          tone={missing > 0 ? "negative" : "neutral"}
          label="Tanpa nominal"
          value={`${missing}`}
          hint={missing > 0 ? "Bulan terkait berstatus Tidak lengkap" : "Semua terisi"}
        />
      </div>

      <TransactionTable
        rows={rows.map((r) => ({
          id: r.id,
          month: r.period.month,
          name: r.name,
          categoryId: r.categoryId,
          amount: r.amount,
          isPaid: r.isPaid,
          note: r.note,
          goalId: r.goalId,
        }))}
        goals={goals}
        categories={categories}
        suggestions={suggestions}
      />
    </>
  );
}
