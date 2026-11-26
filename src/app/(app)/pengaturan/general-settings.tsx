"use client";

import { DatePicker } from "@/components/date-pickers";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/confirm-dialog";
import { Field, useSubmit } from "@/components/form-dialog";
import type { ActionResult } from "@/server/actions";
import { saveSettings } from "@/server/finance-actions";

const pct = (bps: number) => String(bps / 100).replace(".", ",");
const toBps = (s: string) => Math.round(Number(s.replace(",", ".")) * 100);

export function GeneralSettings({
  birthDate,
  depositRateBps,
  interestTaxBps,
  assetDropAlertBps,
}: {
  birthDate: string | null;
  depositRateBps: number;
  interestTaxBps: number;
  assetDropAlertBps: number;
}) {
  const [birth, setBirth] = useState(birthDate ?? "");
  const [rate, setRate] = useState(pct(depositRateBps));
  const [tax, setTax] = useState(pct(interestTaxBps));
  const [drop, setDrop] = useState(pct(assetDropAlertBps));
  const { pending, submit } = useSubmit();
  const invalid = [rate, tax, drop].some((v) => !Number.isFinite(toBps(v)) || toBps(v) < 0 || toBps(v) > 10000);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(
          () => saveSettings({ birthDate: birth || null, depositRateBps: toBps(rate), interestTaxBps: toBps(tax), assetDropAlertBps: toBps(drop) }),
          "Pengaturan disimpan",
        );
      }}
    >
      <Field label="Tanggal lahir" htmlFor="set-birth" hint="Dipakai untuk usia di kalkulator FIRE, agar tidak beda-beda.">
        <DatePicker id="set-birth" clearable placeholder="Belum diisi" yearRange={[1940, new Date().getFullYear()]} value={birth || null} onChange={(v) => setBirth(v ?? "")} />
      </Field>
      <ul className="divide-y rounded-2xl border">
        <PercentField id="set-rate" label="Bunga deposito" hint="Per tahun, untuk kalkulator FIRE" value={rate} onChange={setRate} />
        <PercentField id="set-tax" label="Pajak bunga" hint="Dipotong dari bunga deposito" value={tax} onChange={setTax} />
        <PercentField id="set-drop" label="Alarm aset turun" hint="Peringatan di Asset Tracker" value={drop} onChange={setDrop} />
      </ul>
      <Button write type="submit" className="h-10 rounded-control" disabled={pending || invalid}>
        Simpan pengaturan
      </Button>
    </form>
  );
}

/** Baris pengaturan persen: label + keterangan di kiri, input di kanan (selalu sejajar). */
function PercentField({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </label>
      <div className="relative w-28 shrink-0">
        <Input id={id} inputMode="decimal" className="h-11 pr-8 text-right tabular-nums sm:h-10" value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
      </div>
    </li>
  );
}

/** Daftar nama sederhana: tambah, ganti nama, hapus. */
export function NameListEditor({
  items,
  onSave,
  onDelete,
  addLabel,
  deleteWarning,
}: {
  items: { id: number; name: string }[];
  onSave: (id: number | null, name: string) => Promise<ActionResult>;
  onDelete: (id: number) => Promise<ActionResult>;
  addLabel: string;
  /** Pesan konfirmasi; {name} diganti nama item. */
  deleteWarning: string;
}) {
  const [editing, setEditing] = useState<{ id: number | null; name: string } | null>(null);
  const [dialog, confirm] = useConfirm();
  const { pending, submit, readOnly } = useSubmit();

  const form = editing && (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit(() => onSave(editing.id, editing.name), "Tersimpan", () => setEditing(null));
      }}
    >
      <Input aria-label="Nama" className="h-9 rounded-control" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
      <Button write type="submit" size="icon" aria-label="Simpan" className="size-9 rounded-xl" disabled={pending || !editing.name.trim()}>
        <Check className="size-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Batal" className="size-9" onClick={() => setEditing(null)}>
        <X className="size-4" />
      </Button>
    </form>
  );

  return (
    <div className="space-y-3">
      {dialog}
      <ul className="flex flex-wrap gap-2">
        {items.map((it) =>
          editing?.id === it.id ? (
            <li key={it.id} className="w-full">
              {form}
            </li>
          ) : (
            <li key={it.id} className="group flex max-w-full items-center gap-0.5 rounded-2xl bg-secondary py-1 pr-1 pl-3 text-sm font-medium">
              <span className="line-clamp-2 min-w-0">{it.name}</span>
              <button type="button" disabled={readOnly} aria-label={`Ganti nama ${it.name}`} className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground sm:size-6 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setEditing({ ...it })}>
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                aria-label={`Hapus ${it.name}`}
                disabled={readOnly}
                className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-negative sm:size-6 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={async () => {
                  if (await confirm(deleteWarning.replace("{name}", it.name), { confirmLabel: "Hapus", destructive: true })) submit(() => onDelete(it.id), "Dihapus");
                }}
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ),
        )}
      </ul>
      {editing?.id === null ? (
        form
      ) : (
        <Button write variant="outline" className="h-9 rounded-control" onClick={() => setEditing({ id: null, name: "" })}>
          <Plus className="size-4" /> {addLabel}
        </Button>
      )}
    </div>
  );
}
