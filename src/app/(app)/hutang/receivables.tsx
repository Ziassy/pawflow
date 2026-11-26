"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, HandCoins, History, Pencil, Plus, Trash2, UserRound, Wallet } from "lucide-react";
import { Disclosure } from "@/components/disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/confirm-dialog";
import { DatePicker, MonthPicker } from "@/components/date-pickers";
import { Field, FormActions, FormDialog, useSubmit } from "@/components/form-dialog";
import { RupiahInput } from "@/components/rupiah-input";
import { EmptyState, Progress, Segmented } from "@/components/ui-kit";
import { formatDay, formatMonth, formatPercent, formatRupiah, todayKey, toMonthKey } from "@/lib/format";
import type { LedgerRow, ReceivableSummary } from "@/lib/debt";
import { cn } from "@/lib/utils";
import { addReceivableEntry, deleteReceivable, deleteReceivableEntry, saveReceivable, setInstallmentPaid } from "@/server/finance-actions";

type Base = { id: number; name: string; dueDay: number | null; note: string | null };
type CicilanItem = Base & {
  kind: "CICILAN";
  principal: number;
  installmentCount: number;
  installmentAmount: number;
  startMonth: string;
  summary: ReceivableSummary;
  installments: { id: number; seq: number; month: string; amount: number; paid: boolean }[];
};
type BebasItem = Base & {
  kind: "BEBAS";
  lent: number;
  paid: number;
  balance: number;
  rows: (Omit<LedgerRow, "date"> & { date: string })[];
};
export type ReceivableItem = CicilanItem | BebasItem;

type Draft = {
  id: number | null;
  kind: "CICILAN" | "BEBAS";
  name: string;
  principal: number | null;
  installmentCount: number;
  installmentAmount: number | null;
  dueDay: number | null;
  startMonth: string;
  note: string;
  initialAmount: number | null;
  initialDate: string;
};


function ReceivableForm({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const [d, setD] = useState(draft);
  const [last, setLast] = useState(draft);
  if (draft !== last) {
    setLast(draft);
    setD(draft);
  }
  const { pending, submit } = useSubmit();
  const total = d ? (d.installmentAmount ?? 0) * d.installmentCount : 0;

  return (
    <FormDialog icon={HandCoins} title={d?.id ? "Edit piutang" : "Tambah piutang"} description="Orang lain berutang ke kamu." open={!!draft} onOpenChange={(o) => !o && onClose()}>
      {d && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(
              () =>
                d.kind === "CICILAN"
                  ? saveReceivable(d.id, {
                      kind: "CICILAN",
                      name: d.name,
                      principal: d.principal ?? 0,
                      installmentCount: d.installmentCount,
                      installmentAmount: d.installmentAmount ?? 0,
                      dueDay: d.dueDay,
                      startMonth: d.startMonth,
                      note: d.note || null,
                    })
                  : saveReceivable(d.id, {
                      kind: "BEBAS",
                      name: d.name,
                      note: d.note || null,
                      dueDay: d.dueDay,
                      initial: d.id ? undefined : { date: d.initialDate, amount: d.initialAmount ?? 0 },
                    }),
              "Tersimpan",
              onClose,
            );
          }}
        >
          {!d.id && (
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { k: "BEBAS", title: "Bayar bebas", hint: "Sekali bayar atau nyicil kapan saja", icon: Wallet },
                  { k: "CICILAN", title: "Cicilan tetap", hint: "Jadwal bulanan nominal sama", icon: CalendarClock },
                ] as const
              ).map((o) => (
                <button
                  key={o.k}
                  type="button"
                  aria-pressed={d.kind === o.k}
                  onClick={() => setD({ ...d, kind: o.k })}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-colors",
                    d.kind === o.k ? "border-primary bg-accent ring-2 ring-primary/20" : "hover:bg-secondary",
                  )}
                >
                  <o.icon className={cn("size-5", d.kind === o.k ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-semibold">{o.title}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{o.hint}</span>
                </button>
              ))}
            </div>
          )}
          <Field label="Nama peminjam" htmlFor="rc-name">
            <Input id="rc-name" className="h-11 sm:h-10" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus placeholder="mis. Abdi" />
          </Field>

          {d.kind === "BEBAS" && !d.id && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pinjaman awal" htmlFor="rc-initial">
                <RupiahInput id="rc-initial" className="h-11 sm:h-10" value={d.initialAmount} onChange={(v) => setD({ ...d, initialAmount: v })} />
              </Field>
              <Field label="Tanggal pinjam" htmlFor="rc-initial-date">
                <DatePicker id="rc-initial-date" value={d.initialDate} onChange={(v) => v && setD({ ...d, initialDate: v })} />
              </Field>
            </div>
          )}

          {d.kind === "CICILAN" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Modal (dipinjamkan)" htmlFor="rc-principal">
                  <RupiahInput id="rc-principal" className="h-11 sm:h-10" value={d.principal} onChange={(v) => setD({ ...d, principal: v })} />
                </Field>
                <Field label="Per cicilan" htmlFor="rc-amount">
                  <RupiahInput id="rc-amount" className="h-11 sm:h-10" value={d.installmentAmount} onChange={(v) => setD({ ...d, installmentAmount: v })} />
                </Field>
                <Field label="Jumlah cicilan" htmlFor="rc-count">
                  <Input
                    id="rc-count"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={120}
                    className="h-11 sm:h-10"
                    value={d.installmentCount}
                    onChange={(e) => setD({ ...d, installmentCount: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </Field>
                <Field label="Jatuh tempo (tgl)" htmlFor="rc-due">
                  <Input
                    id="rc-due"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    placeholder="mis. 5"
                    className="h-11 sm:h-10"
                    value={d.dueDay ?? ""}
                    onChange={(e) => setD({ ...d, dueDay: e.target.value ? Number(e.target.value) : null })}
                  />
                </Field>
              </div>
              <Field label="Cicilan pertama" htmlFor="rc-start">
                <MonthPicker id="rc-start" value={d.startMonth} onChange={(v) => v && setD({ ...d, startMonth: v })} />
              </Field>
              <div className="flex flex-wrap justify-between gap-2 rounded-2xl bg-secondary p-3 text-sm">
                <span>
                  Total tagihan <b>{formatRupiah(total)}</b>
                </span>
                <span>
                  Keuntungan <b className={cn(total - (d.principal ?? 0) < 0 && "text-negative")}>{formatRupiah(total - (d.principal ?? 0))}</b>
                </span>
              </div>
            </>
          )}
          <Field label="Catatan" htmlFor="rc-note">
            <Input id="rc-note" className="h-11 sm:h-10" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
          </Field>
          <FormActions pending={pending} onCancel={onClose} />
        </form>
      )}
    </FormDialog>
  );
}

/** Form cepat catatan piutang bebas: Dia bayar / Pinjam lagi. */
function EntryForm({ item, dir, setDir }: { item: BebasItem; dir: "BAYAR" | "PINJAM"; setDir: (d: "BAYAR" | "PINJAM") => void }) {
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(todayKey);
  const [desc, setDesc] = useState("");
  const [income, setIncome] = useState(true);
  const { pending, submit } = useSubmit();
  return (
    <form
      className="space-y-3 border-t bg-secondary/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!amount) return;
        submit(
          () => addReceivableEntry(item.id, { direction: dir, amount, date, description: desc, recordIncome: income }),
          dir === "BAYAR" ? `Pembayaran ${formatRupiah(amount)} dicatat` : `Pinjaman ${formatRupiah(amount)} dicatat`,
          () => {
            setAmount(null);
            setDesc("");
          },
        );
      }}
    >
      <Segmented
        aria-label="Jenis catatan"
        className="flex w-full"
        value={dir}
        onChange={setDir}
        options={[
          { value: "BAYAR", label: "Dia bayar" },
          { value: "PINJAM", label: "Pinjam lagi" },
        ]}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <RupiahInput aria-label="Nominal" placeholder="0" className="h-11 sm:h-10" value={amount} onChange={setAmount} />
        <DatePicker aria-label="Tanggal" value={date} onChange={(v) => v && setDate(v)} />
      </div>
      <Input
        aria-label="Keterangan"
        placeholder={dir === "BAYAR" ? "Keterangan (opsional)" : "Untuk apa? (opsional)"}
        className="h-11 sm:h-10"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {dir === "BAYAR" ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={income} onCheckedChange={(v) => setIncome(!!v)} className="size-5" />
            Catat sebagai Pemasukan
          </label>
        ) : (
          <span className="text-xs text-muted-foreground">Hutang {item.name} akan bertambah.</span>
        )}
        <Button type="submit" className="h-11 flex-1 rounded-control sm:h-10 sm:flex-none" disabled={pending || !amount}>
          {dir === "BAYAR" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
          {dir === "BAYAR" ? "Catat pembayaran" : "Catat pinjaman"}
        </Button>
      </div>
    </form>
  );
}

function CardHeader({ item, onEdit, onDelete, done }: { item: ReceivableItem; onEdit: () => void; onDelete: () => void; done: boolean }) {
  return (
    <header className="flex items-start justify-between gap-2 p-4 pb-3 sm:p-5 sm:pb-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", done ? "bg-positive-soft text-positive" : "bg-accent text-accent-foreground")}>
          <UserRound className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold sm:text-[15px]">{item.name}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("rounded-full px-1.5 py-px font-medium", item.kind === "BEBAS" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700")}>
              {item.kind === "BEBAS" ? "Bayar bebas" : "Cicilan tetap"}
            </span>
            {item.kind === "CICILAN" && (
              <span>
                {item.installmentCount}× {formatRupiah(item.installmentAmount)}
              </span>
            )}
            {item.dueDay && <span>tgl {item.dueDay}</span>}
            {done && <span className="font-medium text-positive">Lunas</span>}
          </div>
        </div>
      </div>
      <div className="flex shrink-0">
        <Button variant="ghost" size="icon" aria-label={`Edit ${item.name}`} onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Hapus ${item.name}`} onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </header>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-sm font-semibold tabular-nums", tone === "positive" && "text-positive", tone === "negative" && "text-negative")}>
        {value}
      </dd>
    </div>
  );
}

export function Receivables({ items, current }: { items: ReceivableItem[]; current: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [dirs, setDirs] = useState<Record<number, "BAYAR" | "PINJAM">>({});
  const openWith = (id: number, d: "BAYAR" | "PINJAM") => {
    setDirs((x) => ({ ...x, [id]: d }));
    setOpen(id, true);
  };
  const isOpen = (id: number) => openIds.has(id);
  const setOpen = (id: number, o: boolean) =>
    setOpenIds((prev) => {
      const n = new Set(prev);
      if (o) n.add(id);
      else n.delete(id);
      return n;
    });
  const [dialog, confirm] = useConfirm();
  const { submit } = useSubmit();

  const blank: Draft = {
    id: null,
    kind: "BEBAS",
    name: "",
    principal: null,
    installmentCount: 1,
    installmentAmount: null,
    dueDay: null,
    startMonth: toMonthKey(new Date()),
    note: "",
    initialAmount: null,
    initialDate: todayKey(),
  };
  const edit = (r: ReceivableItem) =>
    setDraft({
      ...blank,
      id: r.id,
      kind: r.kind,
      name: r.name,
      dueDay: r.dueDay,
      note: r.note ?? "",
      ...(r.kind === "CICILAN"
        ? { principal: r.principal, installmentCount: r.installmentCount, installmentAmount: r.installmentAmount, startMonth: r.startMonth }
        : {}),
    });
  const remove = async (r: ReceivableItem) => {
    if (await confirm(`Hapus piutang "${r.name}" beserta catatannya? Transaksi Pemasukan otomatis tetap ada.`, { confirmLabel: "Hapus", destructive: true }))
      submit(() => deleteReceivable(r.id), "Dihapus");
  };

  return (
    <section className="space-y-4">
      {dialog}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold sm:text-[15px]">Daftar piutang</h2>
        <Button className="h-10 rounded-control" onClick={() => setDraft(blank)}>
          <Plus className="size-4" /> Tambah piutang
        </Button>
      </div>
      {items.length === 0 && <EmptyState>Belum ada piutang.</EmptyState>}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {items.map((r) => {
          if (r.kind === "BEBAS") {
            const done = r.lent > 0 && r.balance <= 0;
            return (
              <article key={r.id} className="overflow-hidden rounded-2xl border bg-card shadow-card">
                <CardHeader item={r} done={done} onEdit={() => edit(r)} onDelete={() => remove(r)} />
                <div className="px-4 sm:px-5">
                  <div className="line-clamp-1 text-xs text-muted-foreground">Sisa hutang {r.name}</div>
                  <div className={cn("text-2xl font-semibold tracking-tight tabular-nums lg:text-[28px]", done && "text-positive")}>{formatRupiah(r.balance)}</div>
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    <Stat label="Total dipinjam" value={formatRupiah(r.lent)} />
                    <Stat label="Sudah dibayar" value={formatRupiah(r.paid)} tone="positive" />
                  </dl>
                  <Progress className="mt-3" value={r.lent ? r.paid / r.lent : null} color="var(--positive)" label={`Terbayar ${r.name}`} />
                  <div className="mt-1 text-right text-xs text-muted-foreground">{formatPercent(r.lent ? r.paid / r.lent : null, 0)} terbayar</div>
                </div>
                <div className="mt-3 flex gap-2 px-4 pb-4 sm:px-5">
                  <Button
                    variant="outline"
                    className="h-10 flex-1 rounded-control bg-card"
                    onClick={() => openWith(r.id, "BAYAR")}
                  >
                    <ArrowDownLeft className="size-4 text-positive" /> Catat bayar
                  </Button>
                  <Button variant="outline" className="h-10 flex-1 rounded-control bg-card" onClick={() => openWith(r.id, "PINJAM")}>
                    <ArrowUpRight className="size-4" /> Pinjam lagi
                  </Button>
                </div>
                <Disclosure
                  open={isOpen(r.id)}
                  onOpenChange={(o) => setOpen(r.id, o)}
                  icon={History}
                  label="Riwayat & catat"
                  hint={`${r.rows.length} catatan`}
                >
                  <div>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-secondary/60 px-4 py-2 text-xs font-medium text-muted-foreground sm:px-5">
                      <span>Tanggal · keterangan</span>
                      <span className="text-right">Mutasi</span>
                      <span className="w-[6.5rem] text-right">Saldo</span>
                    </div>
                    <ul className="max-h-72 divide-y overflow-y-auto">
                      {r.rows.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">Belum ada catatan.</li>}
                      {r.rows.map((e) => (
                        <li key={e.id} className="group grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-4 py-2.5 text-sm sm:px-5">
                          <span className="min-w-0">
                            <span className="line-clamp-2 block font-medium">{e.description}</span>
                            <span className="block text-xs text-muted-foreground">{formatDay(e.date)}</span>
                          </span>
                          <span className={cn("text-right font-semibold whitespace-nowrap tabular-nums", e.credit ? "text-positive" : "text-foreground")}>
                            {e.credit ? `−${formatRupiah(e.credit)}` : `+${formatRupiah(e.debit)}`}
                          </span>
                          <span className="flex w-[6.5rem] items-center justify-end gap-0.5 text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                            {formatRupiah(e.balance)}
                            <button
                              type="button"
                              aria-label="Hapus catatan"
                              className="grid size-7 shrink-0 place-items-center rounded-lg opacity-60 hover:bg-secondary hover:text-negative group-hover:opacity-100"
                              onClick={async () => {
                                if (await confirm(`Hapus catatan "${e.description}" ${formatRupiah(e.amount)}?`, { confirmLabel: "Hapus", destructive: true }))
                                  submit(() => deleteReceivableEntry(e.id), "Catatan dihapus");
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <EntryForm item={r} dir={dirs[r.id] ?? "BAYAR"} setDir={(d) => setDirs((x) => ({ ...x, [r.id]: d }))} />
                </Disclosure>
                {r.note && <p className="border-t px-5 py-3 text-xs text-muted-foreground">{r.note}</p>}
              </article>
            );
          }
          const done = r.summary.remaining === 0;
          return (
            <article key={r.id} className="overflow-hidden rounded-2xl border bg-card shadow-card">
              <CardHeader item={r} done={done} onEdit={() => edit(r)} onDelete={() => remove(r)} />
              <dl className="grid grid-cols-3 gap-2 px-4 sm:px-5">
                <Stat label="Modal" value={formatRupiah(r.principal)} />
                <Stat label="Keuntungan" value={formatRupiah(r.summary.profit)} tone={r.summary.profit > 0 ? "positive" : r.summary.profit < 0 ? "negative" : undefined} />
                <Stat label="Sisa" value={formatRupiah(r.summary.remaining)} />
              </dl>
              <div className="px-4 pt-3 pb-1 sm:px-5">
                <Progress value={r.summary.totalBill ? r.summary.paid / r.summary.totalBill : null} color={done ? "var(--positive)" : undefined} label={`Progres ${r.name}`} />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {r.summary.paidCount}/{r.installments.length} cicilan lunas
                  </span>
                  <span>{formatPercent(r.summary.totalBill ? r.summary.paid / r.summary.totalBill : null, 0)}</span>
                </div>
              </div>
              <Disclosure
                className="mt-3"
                open={isOpen(r.id)}
                onOpenChange={(o) => setOpen(r.id, o)}
                icon={CalendarClock}
                label="Jadwal cicilan"
                hint={`${r.summary.paidCount}/${r.installments.length} lunas`}
              >
              <ul className="max-h-72 divide-y overflow-y-auto text-sm">
                {r.installments.map((i) => (
                  <li key={i.id}>
                    <label className={cn("flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 sm:px-5", i.month === current && !i.paid && "bg-warning-soft/60")}>
                      <Checkbox
                        aria-label={`Cicilan ${i.seq} ${r.name} lunas`}
                        checked={i.paid}
                        className="size-5"
                        onCheckedChange={(v) => submit(() => setInstallmentPaid(i.id, !!v), v ? `Pemasukan dicatat di ${formatMonth(i.month)}` : "Pemasukan dibatalkan")}
                      />
                      <span className="w-8 text-xs text-muted-foreground">#{i.seq}</span>
                      <span className={cn("flex-1", i.paid && "text-muted-foreground")}>
                        {formatMonth(i.month)}
                        {r.dueDay && <span className="text-xs text-muted-foreground"> · tgl {r.dueDay}</span>}
                      </span>
                      <span className={cn("font-semibold tabular-nums", i.paid && "text-positive")}>{formatRupiah(i.amount)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              </Disclosure>
              {r.note && <p className="border-t px-5 py-3 text-xs text-muted-foreground">{r.note}</p>}
            </article>
          );
        })}
      </div>
      <ReceivableForm draft={draft} onClose={() => setDraft(null)} />
    </section>
  );
}
