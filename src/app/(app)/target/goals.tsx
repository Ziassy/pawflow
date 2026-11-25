"use client";

import { Dropdown } from "@/components/dropdown";
import { MonthPicker } from "@/components/date-pickers";
import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/confirm-dialog";
import { Field, FormActions, FormDialog, useSubmit } from "@/components/form-dialog";
import { RupiahInput } from "@/components/rupiah-input";
import { EmptyState, Progress, Segmented } from "@/components/ui-kit";
import { GOAL_COLLECTED_MODE } from "@/lib/constants";
import { addMonths, formatMonth, formatPercent, formatRupiah, monthDiff, toMonthKey } from "@/lib/format";
import { ageAtMonth, monthAtAge } from "@/lib/fire";
import { cn } from "@/lib/utils";
import { deleteGoal, moveGoal, saveGoal } from "@/server/finance-actions";
import type { GoalView } from "@/server/goals";

type Mode = (typeof GOAL_COLLECTED_MODE)[number];
type Draft = {
  id: number | null;
  name: string;
  targetAmount: number | null;
  startMonth: string;
  deadline: string;
  collectedMode: Mode;
  manualCollected: number | null;
  assetTypeId: number | null;
  targetAge: number | null;
  note: string;
};

const MODE_LABEL: Record<Mode, string> = { MANUAL: "Manual", ASSET_TYPE: "Dari jenis aset", TRANSACTIONS: "Dari transaksi" };

function GoalForm({
  draft,
  onClose,
  assetTypes,
  birthMonth,
}: {
  draft: Draft | null;
  onClose: () => void;
  assetTypes: { id: number; name: string }[];
  birthMonth: string | null;
}) {
  const [d, setD] = useState(draft);
  const [last, setLast] = useState(draft);
  if (draft !== last) {
    setLast(draft);
    setD(draft);
  }
  const { pending, submit } = useSubmit();
  const thisMonth = toMonthKey(new Date());
  const start = d?.startMonth || thisMonth;
  // Lama rencana: dari bulan mulai sampai tenggat
  const span = d?.deadline ? monthDiff(start, d.deadline) : null;
  const totalMonths = span !== null && span > 0 ? span : null;
  // Sisa bulan menabung: dari bulan mulai bila belum dimulai, kalau tidak dari bulan ini
  const left = d?.deadline ? monthDiff(start > thisMonth ? start : thisMonth, d.deadline) : null;
  const monthsLeft = left !== null && left > 0 ? left : null;
  const remaining = d ? Math.max(0, (d.targetAmount ?? 0) - (d.collectedMode === "MANUAL" ? (d.manualCollected ?? 0) : 0)) : 0;
  const perMonth = d?.targetAmount && monthsLeft ? Math.ceil(remaining / monthsLeft) : null;
  const startAge = birthMonth ? ageAtMonth(birthMonth, start) : null;
  const ageDeadline = birthMonth && d?.targetAge ? monthAtAge(birthMonth, d.targetAge) : null;
  return (
    <FormDialog icon={Target} description="Satu anak tangga menuju kebebasan finansial." title={d?.id ? "Edit target" : "Tambah target"} open={!!draft} onOpenChange={(o) => !o && onClose()} wide>
      {d && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit(
              () =>
                saveGoal(d.id, {
                  name: d.name,
                  targetAmount: d.targetAmount ?? 0,
                  startMonth: start,
                  deadline: d.deadline || null,
                  collectedMode: d.collectedMode,
                  manualCollected: d.manualCollected ?? 0,
                  assetTypeId: d.assetTypeId,
                  targetAge: d.targetAge,
                  note: d.note || null,
                }),
              "Tersimpan",
              onClose,
            );
          }}
        >
          <Field label="Nama target" htmlFor="g-name">
            <Input id="g-name" className="h-10 rounded-control" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus placeholder="mis. Dana Darurat 6 bulan" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target nominal" htmlFor="g-target" hint="Bisa ketik 1M atau 500jt">
              <RupiahInput id="g-target" className="h-10 rounded-control" value={d.targetAmount} onChange={(v) => setD({ ...d, targetAmount: v })} />
            </Field>
            <Field label="Mulai menabung" htmlFor="g-start" hint={startAge !== null ? `Saat itu umur ${startAge}` : "Patokan lama rencana"}>
              <MonthPicker
                id="g-start"
                value={start}
                onChange={(v) => {
                  const s = v ?? thisMonth;
                  // Tenggat dari usia target tidak bergantung bulan mulai; tenggat manual juga dipertahankan
                  setD({ ...d, startMonth: s });
                }}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Usia target (FIRE)"
              htmlFor="g-age"
              hint={birthMonth ? (ageDeadline ? `Tercapai ${formatMonth(ageDeadline)}` : "Mengisi tenggat otomatis") : "Isi tanggal lahir di Pengaturan agar usia dihitung"}
            >
              <Input
                id="g-age"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                className="h-10 rounded-control"
                placeholder="mis. 40"
                value={d.targetAge ?? ""}
                onChange={(e) => {
                  const age = e.target.value ? Math.floor(Number(e.target.value)) : null;
                  const dl = birthMonth && age && age > 0 ? monthAtAge(birthMonth, age) : null;
                  setD({ ...d, targetAge: age, deadline: dl ?? d.deadline });
                }}
              />
            </Field>
            <Field label="Lama (bulan)" htmlFor="g-months" hint="Dihitung dari bulan mulai">
              <Input
                id="g-months"
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                className="h-10 rounded-control"
                placeholder="mis. 120"
                value={totalMonths ?? ""}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value));
                  const dl = e.target.value && n > 0 ? addMonths(start, n) : "";
                  // Lama diubah manual -> tenggat tidak lagi mengikuti usia target
                  setD({ ...d, deadline: dl, targetAge: dl && ageDeadline === dl ? d.targetAge : null });
                }}
              />
            </Field>
          </div>
          <Field label="Tenggat" htmlFor="g-deadline" hint="Terisi otomatis dari usia target atau lama; bisa diubah">
            <MonthPicker
              id="g-deadline"
              clearable
              placeholder="Tanpa tenggat"
              min={addMonths(start, 1)}
              value={d.deadline || null}
              onChange={(v) => setD({ ...d, deadline: v ?? "", targetAge: v && v === ageDeadline ? d.targetAge : null })}
            />
          </Field>
          {totalMonths !== null && (
            <p className="rounded-xl bg-secondary p-3 text-sm" aria-live="polite">
              {startAge !== null && d.targetAge && d.deadline === ageDeadline ? (
                <>
                  Mulai umur {startAge} ({formatMonth(start)}), FIRE umur {d.targetAge} ({formatMonth(d.deadline)}) ={" "}
                  <strong className="font-semibold tabular-nums">{totalMonths} bulan</strong>.
                </>
              ) : (
                <>
                  {formatMonth(start)} sampai {formatMonth(d.deadline)} = <strong className="font-semibold tabular-nums">{totalMonths} bulan</strong>.
                </>
              )}
              {perMonth !== null && (
                <>
                  {" "}
                  Perlu menabung <strong className="font-semibold tabular-nums">{formatRupiah(perMonth)}/bln</strong>
                  {monthsLeft !== totalMonths && <> selama sisa {monthsLeft} bulan</>}
                  {d.collectedMode === "MANUAL" ? "." : ", belum dikurangi yang sudah terkumpul."}
                </>
              )}
            </p>
          )}
          <Field label="Terkumpul">
            <Segmented
              aria-label="Cara hitung terkumpul"
              className="flex w-full"
              value={d.collectedMode}
              onChange={(v) => setD({ ...d, collectedMode: v })}
              options={GOAL_COLLECTED_MODE.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
            />
          </Field>
          {d.collectedMode === "MANUAL" && (
            <Field label="Jumlah terkumpul" htmlFor="g-collected">
              <RupiahInput id="g-collected" className="h-10 rounded-control" value={d.manualCollected} onChange={(v) => setD({ ...d, manualCollected: v })} />
            </Field>
          )}
          {d.collectedMode === "ASSET_TYPE" && (
            <Field label="Jenis aset" htmlFor="g-asset" hint="Terkumpul = nilai terakhir jenis ini di Asset Tracker">
              <Dropdown
                id="g-asset"
                placeholder="Pilih jenis aset"
                value={d.assetTypeId ? String(d.assetTypeId) : null}
                onChange={(v) => setD({ ...d, assetTypeId: v ? Number(v) : null })}
                options={assetTypes.map((a) => ({ value: String(a.id), label: a.name }))}
              />
            </Field>
          )}
          {d.collectedMode === "TRANSACTIONS" && (
            <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">Terkumpul = jumlah transaksi yang ditautkan ke target ini (pilih “Target” saat edit transaksi).</p>
          )}
          <Field label="Catatan" htmlFor="g-note">
            <Input id="g-note" className="h-10 rounded-control" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
          </Field>
          <FormActions pending={pending} onCancel={onClose} />
        </form>
      )}
    </FormDialog>
  );
}

export function GoalList({ goals, assetTypes, birthMonth }: { goals: GoalView[]; assetTypes: { id: number; name: string }[]; birthMonth: string | null }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [dialog, confirm] = useConfirm();
  const { pending, submit } = useSubmit();

  return (
    <section className="space-y-4">
      {dialog}
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold sm:text-[15px]">Tangga ternak uang</h2>
        <Button
          className="h-9 rounded-control"
          onClick={() =>
            setDraft({ id: null, name: "", targetAmount: null, startMonth: toMonthKey(new Date()), deadline: "", collectedMode: "MANUAL", manualCollected: null, assetTypeId: null, targetAge: null, note: "" })
          }
        >
          <Plus className="size-4" /> Tambah target
        </Button>
      </div>
      {goals.length === 0 && <EmptyState>Belum ada target. Contoh: Tabungan Jarak Dekat, Dana Darurat 6 bulan, Umroh orang tua, Financial Freedom.</EmptyState>}
      <ol className="space-y-3">
        {goals.map((g, i) => {
          const done = g.target > 0 && g.collected >= g.target;
          const open = openId === g.id;
          const f = g.fire;
          return (
            <li key={g.id} className="overflow-hidden rounded-2xl border bg-card shadow-card">
              <div className="flex items-start gap-4 p-5">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold", done ? "bg-positive-soft text-positive" : "bg-accent text-accent-foreground")}>
                  {done ? <CheckCircle2 className="size-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="min-w-0 font-semibold">{g.name}</h3>
                    <span className="text-sm tabular-nums">
                      <b>{formatRupiah(g.collected)}</b> <span className="text-muted-foreground">/ {formatRupiah(g.target)}</span>
                    </span>
                  </div>
                  <Progress className="mt-2.5" value={f.progress} color={done ? "var(--positive)" : undefined} label={`Progres ${g.name}`} />
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{formatPercent(f.progress, 0)}</span>
                    <span>{MODE_LABEL[g.collectedMode as Mode]}{g.assetTypeName && `: ${g.assetTypeName}`}</span>
                    {g.startMonth && <span>Mulai {formatMonth(g.startMonth)}</span>}
                    {g.effectiveDeadline && <span>Tenggat {formatMonth(g.effectiveDeadline)}</span>}
                    {g.totalMonths !== null && g.elapsedMonths !== null && g.totalMonths > 0 && (
                      <span>
                        Bulan ke-{Math.min(g.elapsedMonths + 1, g.totalMonths)} dari {g.totalMonths}
                      </span>
                    )}
                    {g.targetAge && <span>Usia target {g.targetAge}</span>}
                    {g.monthsLeft !== null && <span className={cn(g.monthsLeft <= 0 && !done && "text-negative")}>{g.monthsLeft > 0 ? `${g.monthsLeft} bln lagi` : "Tenggat lewat"}</span>}
                    {f.requiredMonthly !== null && !done && <span>Butuh {formatRupiah(f.requiredMonthly)}/bln</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row">
                  <Button variant="ghost" size="icon-sm" aria-label="Naikkan prioritas" disabled={pending || i === 0} onClick={() => submit(() => moveGoal(g.id, -1))}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Turunkan prioritas" disabled={pending || i === goals.length - 1} onClick={() => submit(() => moveGoal(g.id, 1))}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${g.name}`}
                    onClick={() =>
                      setDraft({
                        id: g.id,
                        name: g.name,
                        targetAmount: g.target,
                        startMonth: g.startMonth ?? "",
                        deadline: g.deadline ?? "",
                        collectedMode: g.collectedMode as Mode,
                        manualCollected: g.manualCollected,
                        assetTypeId: g.assetTypeId,
                        targetAge: g.targetAge,
                        note: g.note ?? "",
                      })
                    }
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus ${g.name}`}
                    onClick={async () => {
                      if (await confirm(`Hapus target "${g.name}"?`, { confirmLabel: "Hapus", destructive: true })) submit(() => deleteGoal(g.id), "Dihapus");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : g.id)}
                className="flex w-full items-center justify-between border-t bg-secondary/50 px-5 py-2.5 text-sm font-medium text-primary hover:bg-secondary"
              >
                Kalkulator FIRE
                <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t p-5 text-sm sm:grid-cols-4">
                  <Stat label="Target dana" value={formatRupiah(g.target)} />
                  <Stat label="Kurang" value={formatRupiah(f.remaining)} />
                  <Stat label="Lama rencana" value={g.totalMonths === null ? "Isi bulan mulai" : `${g.totalMonths} bulan`} />
                  <Stat label="Sisa bulan" value={g.monthsLeft === null ? "Isi tenggat / usia" : `${g.monthsLeft} bulan`} />
                  <Stat label="Rencana awal/bln" value={formatRupiah(g.plannedMonthly)} />
                  <Stat
                    label="Seharusnya terkumpul"
                    value={formatRupiah(g.expectedNow)}
                    warn={g.expectedNow !== null && g.collected < g.expectedNow}
                  />
                  <Stat label="Return bunga/bln (kotor)" value={formatRupiah(f.monthlyInterestGross)} />
                  <Stat label="Return bunga/bln (bersih)" value={formatRupiah(f.monthlyInterestNet)} strong />
                  <Stat label="Tabungan/bln dibutuhkan" value={formatRupiah(f.requiredMonthly)} strong />
                  <Stat label="Jika di deposito" value={formatRupiah(f.requiredMonthlyWithInterest)} />
                  <Stat label="Dari gaji / cari tambahan" value={`${formatRupiah(g.fromSalary)} / ${formatRupiah(g.extra)}`} warn={g.extra > 0} />
                </dl>
              )}
            </li>
          );
        })}
      </ol>
      <GoalForm draft={draft} onClose={() => setDraft(null)} assetTypes={assetTypes} birthMonth={birthMonth} />
    </section>
  );
}

function Stat({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 tabular-nums", strong && "font-semibold", warn && "font-semibold text-warning")}>{value}</dd>
    </div>
  );
}
