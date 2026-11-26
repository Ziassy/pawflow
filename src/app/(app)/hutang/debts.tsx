"use client";

import { Dropdown } from "@/components/dropdown";
import { DatePicker, MonthPicker } from "@/components/date-pickers";
import { useState } from "react";
import { CheckCircle2, ChevronsDown, ChevronsUp, CreditCard, History, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/confirm-dialog";
import { EditableMoneyCell } from "@/components/editable-money";
import { Disclosure } from "@/components/disclosure";
import { Field, FormActions, FormDialog, useSubmit } from "@/components/form-dialog";
import { RupiahInput } from "@/components/rupiah-input";
import { EmptyState, Progress, Segmented } from "@/components/ui-kit";
import { DEBT_KIND, DEBT_KIND_LABEL } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { signalNavigate } from "@/components/nav-progress";
import { addMonths, formatDay, formatMonth, formatRupiah, todayKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  addDebtEntry,
  deleteDebt,
  deleteDebtEntry,
  saveDebt,
  setDebtPlan,
  setDebtPlanPaid,
  setDebtSnapshot,
} from "@/server/finance-actions";

type DebtKind = (typeof DEBT_KIND)[number];
type DebtDraft = { id: number | null; name: string; kind: DebtKind; note: string; active: boolean };

function DebtFormDialog({
  draft,
  onClose,
  kinds,
}: {
  draft: DebtDraft | null;
  onClose: () => void;
  kinds: readonly DebtKind[];
}) {
  const [d, setD] = useState<DebtDraft | null>(draft);
  const [last, setLast] = useState(draft);
  if (draft !== last) {
    setLast(draft);
    setD(draft);
  }
  const { pending, submit } = useSubmit();
  return (
    <FormDialog
      icon={kinds.length === 1 ? UserRound : CreditCard}
      title={d?.id ? "Edit hutang" : kinds.length === 1 ? "Tambah orang" : "Tambah kartu / cicilan"}
      description={kinds.length === 1 ? "Catat hutang ke teman atau keluarga." : "Kartu kredit, paylater, atau cicilan lain."}
      open={!!draft}
      onOpenChange={(o) => !o && onClose()}
    >
      {d && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit(() => saveDebt(d.id, { name: d.name, kind: d.kind, note: d.note || null, active: d.active }), "Tersimpan", onClose);
          }}
        >
          <Field label="Nama" htmlFor="debt-name">
            <Input id="debt-name" className="h-10 rounded-control" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus />
          </Field>
          {kinds.length > 1 && (
            <Field label="Jenis" htmlFor="debt-kind">
              <Dropdown
                id="debt-kind"
                value={d.kind}
                onChange={(v) => v && setD({ ...d, kind: v as DebtKind })}
                options={kinds.map((k) => ({ value: k, label: DEBT_KIND_LABEL[k] }))}
              />
            </Field>
          )}
          <Field label="Catatan" htmlFor="debt-note">
            <Input id="debt-note" className="h-10 rounded-control" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={d.active} onCheckedChange={(v) => setD({ ...d, active: !!v })} className="size-5" />
            Aktif (ikut dihitung di total)
          </label>
          <FormActions pending={pending} onCancel={onClose} />
        </form>
      )}
    </FormDialog>
  );
}

type DebtCard = {
  id: number;
  name: string;
  kind: string;
  note: string | null;
  active: boolean;
  balance: number | null;
  baseMonth: string | null;
  remaining: number | null;
  payoffMonth: string | null;
  paidOff: boolean;
};

export function DebtList({ debts }: { debts: DebtCard[] }) {
  const [draft, setDraft] = useState<DebtDraft | null>(null);
  const [dialog, confirm] = useConfirm();
  const { submit } = useSubmit();
  const kinds = DEBT_KIND.filter((k) => k !== "PRIBADI");

  return (
    <section>
      {dialog}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold sm:text-[15px]">Daftar kartu & cicilan</h2>
        <Button className="h-9 rounded-control" onClick={() => setDraft({ id: null, name: "", kind: "KARTU", note: "", active: true })}>
          <Plus className="size-4" /> Tambah
        </Button>
      </div>
      {debts.length === 0 ? null : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {debts.map((d) => (
            <div key={d.id} className={cn("rounded-2xl border bg-card p-4 shadow-card", !d.active && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <CreditCard className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-sm font-semibold sm:text-[15px]">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {DEBT_KIND_LABEL[d.kind as DebtKind] ?? d.kind}
                      {!d.active && " · nonaktif"}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${d.name}`} onClick={() => setDraft({ id: d.id, name: d.name, kind: d.kind as DebtKind, note: d.note ?? "", active: d.active })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${d.name}`}
                    onClick={async () => {
                      if (await confirm(`Hapus "${d.name}" beserta saldo & rencananya? Transaksi yang sudah tercatat tetap ada.`, { confirmLabel: "Hapus", destructive: true }))
                        submit(() => deleteDebt(d.id), "Dihapus");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-tight tabular-nums lg:text-[28px]">{formatRupiah(d.balance)}</div>
              <div className="text-xs text-muted-foreground">{d.baseMonth ? `Saldo ${formatMonth(d.baseMonth)}` : "Belum ada saldo"}</div>
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Perkiraan lunas</span>
                {d.paidOff ? (
                  <span className="flex items-center gap-1 font-medium text-positive">
                    <CheckCircle2 className="size-4" /> Lunas
                  </span>
                ) : (
                  <span className={cn("font-medium", !d.payoffMonth && d.balance && "text-warning")}>
                    {d.payoffMonth ? formatMonth(d.payoffMonth) : d.balance ? `Kurang ${formatRupiah(d.remaining)}` : "–"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <DebtFormDialog draft={draft} onClose={() => setDraft(null)} kinds={kinds} />
    </section>
  );
}

type GridDebt = {
  id: number;
  name: string;
  snapshots: Record<string, number>;
  plans: Record<string, { id: number; amount: number; paid: boolean }>;
};

/** Kontrol rentang bulan tabel (disimpan di URL agar bisa dibagikan/di-refresh). */
function RangeControls({ range }: { range: { from: string; to: string; isDefault: boolean } }) {
  const router = useRouter();
  const go = (from: string, to: string) => {
    signalNavigate();
    router.push(`/hutang?dari=${from}&sampai=${to}`, { scroll: false });
  };
  const btn = "h-9 rounded-control bg-card px-3 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-5">
      <span className="text-xs font-medium text-muted-foreground">Periode</span>
      <MonthPicker compact aria-label="Dari bulan" value={range.from} onChange={(v) => v && go(v, range.to < v ? v : range.to)} />
      <span className="text-muted-foreground">–</span>
      <MonthPicker compact aria-label="Sampai bulan" value={range.to} onChange={(v) => v && go(range.from > v ? v : range.from, v)} />
      <Button variant="outline" className={btn} aria-label="Tambah 1 tahun sebelumnya" onClick={() => go(addMonths(range.from, -12), range.to)}>
        <ChevronsUp className="size-4" /> <span className="sm:hidden">1 thn lalu</span>
        <span className="hidden sm:inline">1 tahun sebelumnya</span>
      </Button>
      <Button variant="outline" className={btn} aria-label="Tambah 1 tahun ke depan" onClick={() => go(range.from, addMonths(range.to, 12))}>
        <ChevronsDown className="size-4" /> <span className="sm:hidden">+1 thn</span>
        <span className="hidden sm:inline">+ 1 tahun ke depan</span>
      </Button>
      {!range.isDefault && (
        <Button
          variant="ghost"
          className="h-9 rounded-control px-3 text-sm"
          onClick={() => {
            signalNavigate();
            router.push("/hutang", { scroll: false });
          }}
        >
          Reset
        </Button>
      )}
    </div>
  );
}

export function DebtGrid({
  months,
  debts,
  current,
  range,
}: {
  months: string[];
  debts: GridDebt[];
  current: string;
  range: { from: string; to: string; isDefault: boolean };
}) {
  const [mode, setMode] = useState<"saldo" | "rencana">("rencana");
  const { submit } = useSubmit();

  const rowTotal = (m: string) =>
    debts.reduce((s, d) => s + (mode === "saldo" ? (d.snapshots[m] ?? 0) : (d.plans[m]?.amount ?? 0)), 0);
  const colTotal = (d: GridDebt) =>
    mode === "saldo" ? null : Object.values(d.plans).reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <RangeControls range={range} />
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <Segmented
          aria-label="Mode tabel"
          value={mode}
          onChange={setMode}
          options={[
            { value: "rencana", label: "Rencana bayar" },
            { value: "saldo", label: "Saldo sisa" },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {mode === "rencana"
            ? "Centang ✓ saat dibayar: otomatis jadi transaksi Cicilan di bulan itu."
            : "Saldo sisa di awal bulan, sebelum pembayaran bulan itu."}
        </p>
      </div>
      <div className="mt-4 max-h-[70vh] overflow-auto border-t">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-secondary text-xs text-muted-foreground">
            <tr>
              <th className="sticky left-0 z-20 bg-secondary px-3 py-2.5 text-left font-medium sm:px-4">Bulan</th>
              {debts.map((d) => (
                <th key={d.id} className="px-2 py-2.5 text-right font-medium whitespace-nowrap">
                  {d.name}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium sm:px-4">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {months.map((m) => (
              <tr key={m} className={cn(m === current && "bg-accent")}>
                <td className={cn("sticky left-0 z-10 px-3 py-0.5 font-medium whitespace-nowrap sm:px-4", m === current ? "bg-accent" : "bg-card")}>
                  {formatMonth(m)}
                  {m === current && <span className="ml-1.5 text-[11px] font-semibold text-primary">SEKARANG</span>}
                </td>
                {debts.map((d) => {
                  const plan = d.plans[m];
                  return (
                    <td key={d.id} className="px-1 py-0.5">
                      {mode === "saldo" ? (
                        <EditableMoneyCell
                          label={`Saldo ${d.name} ${formatMonth(m)}`}
                          value={d.snapshots[m] ?? null}
                          allowNegative
                          onSave={(v) => setDebtSnapshot(d.id, m, v)}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <EditableMoneyCell
                            label={`Rencana ${d.name} ${formatMonth(m)}`}
                            value={plan?.amount ?? null}
                            className={cn(plan?.paid && "text-positive")}
                            onSave={(v) => setDebtPlan(d.id, m, v)}
                          />
                          {plan ? (
                            <Checkbox
                              aria-label={`${d.name} ${formatMonth(m)} sudah dibayar`}
                              checked={plan.paid}
                              className="size-5"
                              onCheckedChange={(v) =>
                                submit(() => setDebtPlanPaid(plan.id, !!v), v ? `Tercatat di transaksi ${formatMonth(m)}` : "Transaksi dibatalkan")
                              }
                            />
                          ) : (
                            <span className="size-5 shrink-0" />
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-0.5 text-right font-medium whitespace-nowrap tabular-nums sm:px-4">
                  {rowTotal(m) ? formatRupiah(rowTotal(m)) : <span className="text-muted-foreground/50">–</span>}
                </td>
              </tr>
            ))}
          </tbody>
          {mode === "rencana" && (
            <tfoot className="sticky bottom-0 z-20 bg-secondary text-sm font-semibold">
              <tr>
                <td className="sticky left-0 z-30 bg-secondary px-3 py-2.5 sm:px-4">Total rencana</td>
                {debts.map((d) => (
                  <td key={d.id} className="px-3 py-2.5 text-right tabular-nums">
                    {formatRupiah(colTotal(d))}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">{formatRupiah(debts.reduce((s, d) => s + (colTotal(d) ?? 0), 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hutang ke orang
// ---------------------------------------------------------------------------

type Personal = {
  id: number;
  name: string;
  note: string | null;
  active: boolean;
  balance: number;
  entries: { id: number; date: string; description: string; amount: number; balance: number }[];
};

function EntryForm({ debtId, dir, setDir }: { debtId: number; dir: "pinjam" | "bayar"; setDir: (d: "pinjam" | "bayar") => void }) {
  const [date, setDate] = useState(todayKey);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const { pending, submit } = useSubmit();
  return (
    <form
      className="space-y-3 border-t bg-secondary/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!amount) return;
        submit(
          () => addDebtEntry(debtId, { date, description: desc.trim() || (dir === "pinjam" ? "Pinjam" : "Bayar"), amount: dir === "pinjam" ? amount : -amount }),
          "Dicatat",
          () => {
            setDesc("");
            setAmount(null);
          },
        );
      }}
    >
      <Segmented
        aria-label="Arah"
        className="flex w-full"
        value={dir}
        onChange={setDir}
        options={[
          { value: "bayar", label: "Aku bayar" },
          { value: "pinjam", label: "Pinjam lagi" },
        ]}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <RupiahInput aria-label="Nominal" placeholder="0" className="h-11 sm:h-10" value={amount} onChange={setAmount} />
        <DatePicker aria-label="Tanggal" value={date} onChange={(v) => v && setDate(v)} />
      </div>
      <Input aria-label="Keterangan" placeholder="Keterangan (opsional)" className="h-11 sm:h-10" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <Button type="submit" className="h-11 w-full rounded-control sm:h-10" disabled={pending || !amount}>
        {dir === "bayar" ? "Catat pembayaran" : "Catat pinjaman"}
      </Button>
    </form>
  );
}

export function PersonalDebts({ debts }: { debts: Personal[] }) {
  const [draft, setDraft] = useState<DebtDraft | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [dirs, setDirs] = useState<Record<number, "pinjam" | "bayar">>({});
  const [dialog, confirm] = useConfirm();
  const { submit } = useSubmit();
  const openWith = (id: number, d: "pinjam" | "bayar") => {
    setDirs((x) => ({ ...x, [id]: d }));
    setOpenId(id);
  };
  return (
    <section className="space-y-4">
      {dialog}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold sm:text-[15px]">Per orang</h2>
        <Button className="h-10 rounded-control" onClick={() => setDraft({ id: null, name: "", kind: "PRIBADI", note: "", active: true })}>
          <Plus className="size-4" /> Tambah orang
        </Button>
      </div>
      {debts.length === 0 && <EmptyState>Belum ada catatan hutang ke orang.</EmptyState>}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {debts.map((d) => {
          const borrowed = d.entries.reduce((s, e) => s + Math.max(0, e.amount), 0);
          const paid = d.entries.reduce((s, e) => s + Math.max(0, -e.amount), 0);
          const done = borrowed > 0 && d.balance <= 0;
          return (
            <article key={d.id} className="overflow-hidden rounded-2xl border bg-card shadow-card">
              <header className="flex items-start justify-between gap-2 p-4 pb-3 sm:p-5 sm:pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", done ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative")}>
                    <UserRound className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-sm font-semibold sm:text-[15px]">{d.name}</div>
                    <div className="line-clamp-1 text-xs text-muted-foreground">{done ? "Lunas" : (d.note ?? "Hutang ke orang")}</div>
                  </div>
                </div>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${d.name}`} onClick={() => setDraft({ id: d.id, name: d.name, kind: "PRIBADI", note: d.note ?? "", active: d.active })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${d.name}`}
                    onClick={async () => {
                      if (await confirm(`Hapus "${d.name}" beserta semua catatannya?`, { confirmLabel: "Hapus", destructive: true })) submit(() => deleteDebt(d.id), "Dihapus");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </header>
              <div className="px-4 sm:px-5">
                <div className="text-xs text-muted-foreground">Sisa hutangku</div>
                <div className={cn("text-2xl font-semibold tracking-tight tabular-nums lg:text-[28px]", d.balance > 0 ? "text-negative" : "text-positive")}>{formatRupiah(d.balance)}</div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Total pinjam</dt>
                    <dd className="font-semibold tabular-nums">{formatRupiah(borrowed)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Sudah dibayar</dt>
                    <dd className="font-semibold text-positive tabular-nums">{formatRupiah(paid)}</dd>
                  </div>
                </dl>
                <Progress className="mt-3" value={borrowed ? paid / borrowed : null} color="var(--positive)" label={`Terbayar ke ${d.name}`} />
              </div>
              <div className="mt-3 flex gap-2 px-4 pb-4 sm:px-5">
                <Button variant="outline" className="h-10 flex-1 rounded-control bg-card" onClick={() => openWith(d.id, "bayar")}>
                  Catat bayar
                </Button>
                <Button variant="outline" className="h-10 flex-1 rounded-control bg-card" onClick={() => openWith(d.id, "pinjam")}>
                  Pinjam lagi
                </Button>
              </div>
              <Disclosure open={openId === d.id} onOpenChange={(o) => setOpenId(o ? d.id : null)} icon={History} label="Riwayat & catat" hint={`${d.entries.length} catatan`}>
                <ul className="max-h-72 divide-y overflow-y-auto text-sm">
                  {d.entries.length === 0 && <li className="px-5 py-3 text-muted-foreground">Belum ada catatan.</li>}
                  {d.entries.map((e) => (
                    <li key={e.id} className="group grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-4 py-2.5 sm:px-5">
                      <span className="min-w-0">
                        <span className="line-clamp-2 block font-medium">{e.description}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDay(e.date)}
                        </span>
                      </span>
                      <span className={cn("text-right font-semibold whitespace-nowrap tabular-nums", e.amount < 0 ? "text-positive" : "")}>
                        {e.amount < 0 ? `−${formatRupiah(-e.amount)}` : `+${formatRupiah(e.amount)}`}
                      </span>
                      <span className="flex w-[6.5rem] items-center justify-end gap-0.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                        {formatRupiah(e.balance)}
                        <button
                          type="button"
                          aria-label="Hapus catatan"
                          className="grid size-7 shrink-0 place-items-center rounded-lg opacity-60 hover:bg-secondary hover:text-negative group-hover:opacity-100"
                          onClick={async () => {
                            if (await confirm(`Hapus catatan "${e.description}"?`, { confirmLabel: "Hapus" })) submit(() => deleteDebtEntry(e.id), "Dihapus");
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <EntryForm debtId={d.id} dir={dirs[d.id] ?? "bayar"} setDir={(x) => setDirs((m) => ({ ...m, [d.id]: x }))} />
              </Disclosure>
            </article>
          );
        })}
      </div>
      <DebtFormDialog draft={draft} onClose={() => setDraft(null)} kinds={["PRIBADI"]} />
    </section>
  );
}
