"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadOnly } from "@/components/read-only";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDialog } from "@/components/form-dialog";
import { useConfirm } from "@/components/confirm-dialog";
import { CategoryIcon, EmptyState } from "@/components/ui-kit";
import { TransactionForm, type CategoryOption, type GoalOption, type Suggestion } from "@/components/transaction-form";
import {
  createTransaction,
  deleteTransaction,
  setTransactionPaid,
  updateTransaction,
  type ActionResult,
} from "@/server/actions";
import type { TransactionInput } from "@/lib/schemas";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tx = {
  id: number;
  name: string;
  categoryId: number;
  amount: number | null;
  isPaid: boolean;
  note: string | null;
  source: string;
  goalId: number | null;
};

/** Jalankan aksi simpan; jika duplikat, minta konfirmasi lalu ulangi dengan confirm=true. */
async function saveWithDuplicateCheck(
  run: (confirmDup: boolean) => Promise<ActionResult>,
  confirm: (msg: string, o?: { title?: string; confirmLabel?: string }) => Promise<boolean>,
): Promise<boolean> {
  let res = await run(false);
  if (!res.ok && "duplicate" in res) {
    const ok = await confirm(res.duplicate, { title: "Kemungkinan duplikat", confirmLabel: "Tetap simpan" });
    if (!ok) return false;
    res = await run(true);
  }
  if (!res.ok) {
    toast.error("error" in res ? res.error : "Gagal menyimpan");
    return false;
  }
  return true;
}

export function QuickAdd({
  periodId,
  categories,
  suggestions,
}: {
  periodId: number;
  categories: CategoryOption[];
  suggestions: Suggestion[];
}) {
  const [dialog, confirm] = useConfirm();
  return (
    <>
      {dialog}
      <TransactionForm
        compact
        categories={categories}
        suggestions={suggestions}
        submitLabel="Tambah"
        onSubmit={async (data) => {
          const ok = await saveWithDuplicateCheck((c) => createTransaction(periodId, data, c), confirm);
          if (ok) toast.success(`${data.name} ditambahkan`);
          return ok;
        }}
      />
    </>
  );
}

export function TransactionList({
  transactions,
  categories,
  suggestions,
  goals,
}: {
  periodId: number;
  transactions: Tx[];
  categories: CategoryOption[];
  suggestions: Suggestion[];
  goals: GoalOption[];
}) {
  const [optimistic, setPaid] = useOptimistic(transactions, (state, u: { id: number; isPaid: boolean }) =>
    state.map((t) => (t.id === u.id ? { ...t, isPaid: u.isPaid } : t)),
  );
  const [, start] = useTransition();
  const [editing, setEditing] = useState<Tx | null>(null);
  // Grup terbuka otomatis jika masih ada yang belum dibayar / belum ada nominal
  const [openOverride, setOpenOverride] = useState<Record<number, boolean>>({});
  const needsAttention = (items: Tx[]) => items.some((t) => !t.isPaid || t.amount === null);
  const isOpen = (id: number, items: Tx[]) => openOverride[id] ?? needsAttention(items);
  const toggle = (id: number, items: Tx[]) => setOpenOverride((o) => ({ ...o, [id]: !isOpen(id, items) }));
  const [dialog, confirm] = useConfirm();
  const readOnly = useReadOnly();
  const catById = new Map(categories.map((c) => [c.id, c]));

  // Kelompokkan per kategori sesuai urutan kategori
  const groups = categories
    .map((c) => ({ cat: c, items: optimistic.filter((t) => t.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);

  if (optimistic.length === 0) {
    return (
      <EmptyState>Belum ada transaksi bulan ini. Tambahkan lewat form di atas.</EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {dialog}
      {groups.map(({ cat, items }) => {
        const total = items.reduce((s, t) => s + (t.amount ?? 0), 0);
        return (
          <section key={cat.id} className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <button
              type="button"
              aria-expanded={isOpen(cat.id, items)}
              onClick={() => toggle(cat.id, items)}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/40"
            >
              <CategoryIcon name={cat.name} color={cat.color} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {cat.name}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{items.length}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {(() => {
                    const unpaid = items.filter((t) => !t.isPaid).length;
                    const missing = items.filter((t) => t.amount === null).length;
                    if (missing) return <span className="text-warning">{missing} belum ada nominal</span>;
                    return unpaid ? `${unpaid} belum dibayar` : "✓ Lunas semua";
                  })()}
                </span>
              </span>
              <span className="font-semibold tabular-nums">{formatRupiah(total)}</span>
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", isOpen(cat.id, items) && "rotate-180")} />
            </button>
            <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen(cat.id, items) ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
            <div className="min-h-0 overflow-hidden" inert={!isOpen(cat.id, items)}>
            <ul className="divide-y border-t">
              {items.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 transition-colors hover:bg-secondary/50">
                  <Checkbox
                    write
                    checked={t.isPaid}
                    aria-label={`${t.name} sudah dibayar`}
                    className="size-5 rounded-md"
                    onCheckedChange={(v) =>
                      start(async () => {
                        setPaid({ id: t.id, isPaid: !!v });
                        const res = await setTransactionPaid(t.id, !!v);
                        if (!res.ok) toast.error("Gagal menyimpan");
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    disabled={readOnly}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left disabled:cursor-default"
                  >
                    <CategoryIcon name={cat.name} color={cat.color} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("line-clamp-2 block text-sm font-medium", t.isPaid && "text-muted-foreground")}>
                        {t.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.note ?? (t.isPaid ? "Sudah dibayar" : "Belum dibayar")}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        t.amount === null && "rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning",
                        t.amount !== null && t.amount < 0 && "text-negative",
                        catById.get(t.categoryId)?.kind === "INCOME" && t.amount !== null && "text-positive",
                      )}
                    >
                      {t.amount === null
                        ? "isi nominal"
                        : `${catById.get(t.categoryId)?.kind === "INCOME" && t.amount > 0 ? "+" : ""}${formatRupiah(t.amount)}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            </div>
            </div>
          </section>
        );
      })}

      <FormDialog
        wide
        icon={Pencil}
        title="Edit transaksi"
        description={editing ? `${catById.get(editing.categoryId)?.name ?? ""} · ${editing.isPaid ? "Sudah dibayar" : "Belum dibayar"}` : undefined}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      >
          {editing && (
            <TransactionForm
              key={editing.id}
              goals={goals}
              categories={categories}
              suggestions={suggestions}
              initial={editing as TransactionInput}
              onCancel={() => setEditing(null)}
              onSubmit={async (data) => {
                const ok = await saveWithDuplicateCheck((c) => updateTransaction(editing.id, data, c), confirm);
                if (ok) {
                  toast.success("Tersimpan");
                  setEditing(null);
                }
                return ok;
              }}
              extraActions={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 text-destructive"
                  aria-label="Hapus transaksi"
                  onClick={async () => {
                    const ok = await confirm(`Hapus "${editing.name}"?`, {
                      title: "Hapus transaksi",
                      confirmLabel: "Hapus",
                    });
                    if (!ok) return;
                    const res = await deleteTransaction(editing.id);
                    if (res.ok) {
                      toast.success("Dihapus");
                      setEditing(null);
                    } else toast.error("Gagal menghapus");
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              }
            />
          )}
      </FormDialog>
    </div>
  );
}
