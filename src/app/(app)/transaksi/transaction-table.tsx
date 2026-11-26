"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadOnly } from "@/components/read-only";
import { useConfirm } from "@/components/confirm-dialog";
import { CategoryDot, CategoryIcon, EmptyState } from "@/components/ui-kit";
import { TransactionForm, type CategoryOption, type GoalOption, type Suggestion } from "@/components/transaction-form";
import { deleteTransaction, updateTransaction } from "@/server/actions";
import { formatMonth, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE = 100;

type Row = {
  id: number;
  month: string;
  name: string;
  categoryId: number;
  amount: number | null;
  isPaid: boolean;
  note: string | null;
  goalId: number | null;
};

export function TransactionTable({
  rows,
  categories,
  suggestions,
  goals,
}: {
  goals: GoalOption[];
  rows: Row[];
  categories: CategoryOption[];
  suggestions: Suggestion[];
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [dialog, confirm] = useConfirm();
  const readOnly = useReadOnly();
  const catById = new Map(categories.map((c) => [c.id, c]));

  if (rows.length === 0) {
    return (
      <EmptyState>Tidak ada transaksi yang cocok dengan filter.</EmptyState>
    );
  }

  const visible = rows.slice(0, limit);

  const editor = (r: Row) => (
    <div className="bg-muted/30 p-3">
      <TransactionForm
        goals={goals}
        categories={categories}
        suggestions={suggestions}
        initial={{ ...r }}
        onCancel={() => setEditingId(null)}
        onSubmit={async (data) => {
          let res = await updateTransaction(r.id, data, false);
          if (!res.ok && "duplicate" in res) {
            if (!(await confirm(res.duplicate, { title: "Kemungkinan duplikat", confirmLabel: "Tetap simpan" }))) return false;
            res = await updateTransaction(r.id, data, true);
          }
          if (!res.ok) {
            toast.error("error" in res ? res.error : "Gagal menyimpan");
            return false;
          }
          toast.success("Tersimpan");
          setEditingId(null);
          return true;
        }}
        extraActions={
          <Button write
            type="button"
            variant="ghost"
            className="h-10 text-destructive"
            aria-label="Hapus"
            onClick={async () => {
              if (!(await confirm(`Hapus "${r.name}" (${formatMonth(r.month)})?`, { title: "Hapus transaksi", confirmLabel: "Hapus" })))
                return;
              const res = await deleteTransaction(r.id);
              if (res.ok) {
                toast.success("Dihapus");
                setEditingId(null);
              } else toast.error("Gagal menghapus");
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </div>
  );

  const amountCls = (r: Row) =>
    cn(
      "tabular-nums",
      r.amount === null && "text-warning",
      r.amount !== null && r.amount < 0 && "text-negative",
      catById.get(r.categoryId)?.kind === "INCOME" && r.amount !== null && "text-positive",
    );

  return (
    <>
      {dialog}
      {/* HP: daftar kartu */}
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card md:hidden">
        {visible.map((r) =>
          editingId === r.id ? (
            <li key={r.id}>{editor(r)}</li>
          ) : (
            <li key={r.id}>
              <button type="button" disabled={readOnly} onClick={() => setEditingId(r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default">
                <CategoryIcon name={catById.get(r.categoryId)?.name ?? ""} color={catById.get(r.categoryId)?.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatMonth(r.month)} · {catById.get(r.categoryId)?.name} · {r.isPaid ? "Dibayar" : "Belum dibayar"}
                  </span>
                </span>
                <span className={cn("text-sm font-semibold", amountCls(r))}>{formatRupiah(r.amount)}</span>
              </button>
            </li>
          ),
        )}
      </ul>

      {/* Desktop: tabel */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-card shadow-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Bulan</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 text-right font-medium">Jumlah</th>
              <th className="px-4 py-3 font-medium">Dibayar</th>
              <th className="px-4 py-3 font-medium">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((r) => (
              <Fragment key={r.id}>
                {editingId === r.id ? (
                  <tr>
                    <td colSpan={6}>{editor(r)}</td>
                  </tr>
                ) : (
                  <tr className={cn("transition-colors", !readOnly && "cursor-pointer hover:bg-secondary/40")} onClick={() => !readOnly && setEditingId(r.id)}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/bulanan/${r.month}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {formatMonth(r.month)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <CategoryDot name={catById.get(r.categoryId)?.name ?? ""} color={catById.get(r.categoryId)?.color} />
                        {catById.get(r.categoryId)?.name}
                      </span>
                    </td>
                    <td className={cn("px-3 py-2 text-right", amountCls(r))}>{formatRupiah(r.amount)}</td>
                    <td className="px-4 py-3">
                      {r.isPaid ? (
                        <span className="rounded-full bg-positive-soft px-2 py-0.5 text-xs font-medium text-positive">Dibayar</span>
                      ) : (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">Belum</span>
                      )}
                    </td>
                    <td className="max-w-64 truncate px-3 py-2 text-muted-foreground">{r.note}</td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <div className="mt-4 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <span>
            Menampilkan {limit} dari {rows.length} transaksi
          </span>
          <Button variant="outline" className="h-10 rounded-control bg-card" onClick={() => setLimit((l) => l + PAGE)}>
            Tampilkan lebih banyak
          </Button>
        </div>
      )}
    </>
  );
}
