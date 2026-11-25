"use client";

import { categoryTheme } from "@/lib/category-theme";
import { Dropdown } from "@/components/dropdown";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RupiahInput } from "@/components/rupiah-input";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteTemplate, saveTemplate } from "@/server/actions";
import { formatRupiah } from "@/lib/format";

type Cat = { id: number; name: string };
type Tpl = { id: number; name: string; categoryId: number; defaultAmount: number | null; active: boolean; debtId: number | null };
type DebtOpt = { id: number; name: string; active: boolean };
type Draft = Omit<Tpl, "id"> & { id: number | null };

const EMPTY: Draft = { id: null, name: "", categoryId: 0, defaultAmount: null, active: true, debtId: null };
const NO_DEBT = "none";

export function TemplateEditor({ templates, categories, debts }: { templates: Tpl[]; categories: Cat[]; debts: DebtOpt[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, start] = useTransition();
  const [dialog, confirm] = useConfirm();
  const catName = (id: number) => categories.find((c) => c.id === id)?.name ?? "–";
  const debtName = (id: number | null) => (id ? (debts.find((d) => d.id === id)?.name ?? null) : null);

  const save = () =>
    draft &&
    start(async () => {
      const { id, ...data } = draft;
      const res = await saveTemplate(id, data);
      if (res.ok) {
        toast.success("Template disimpan");
        setDraft(null);
      } else toast.error("error" in res ? res.error : "Gagal");
    });

  const form = draft && (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          aria-label="Nama"
          placeholder="Nama item"
          className="col-span-2 h-10 text-base md:text-sm"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          autoFocus
        />
        <Dropdown
          aria-label="Kategori"
          placeholder="Pilih kategori"
          value={draft.categoryId ? String(draft.categoryId) : null}
          onChange={(v) => setDraft({ ...draft, categoryId: v ? Number(v) : 0 })}
          options={categories.map((c) => ({ value: String(c.id), label: c.name, color: categoryTheme(c.name).color }))}
        />
        <RupiahInput
          aria-label="Nominal default"
          placeholder="Nominal default"
          className="h-10 text-base md:text-sm"
          value={draft.defaultAmount}
          onChange={(v) => setDraft({ ...draft, defaultAmount: v })}
        />
        <div className="col-span-2 space-y-1">
          <Dropdown
            aria-label="Ambil nominal dari kartu & cicilan"
            value={draft.debtId ? String(draft.debtId) : NO_DEBT}
            onChange={(v) => setDraft({ ...draft, debtId: v && v !== NO_DEBT ? Number(v) : null })}
            options={[
              { value: NO_DEBT, label: "Nominal tetap (tidak terhubung)" },
              ...debts.map((d) => ({ value: String(d.id), label: `Ikut rencana: ${d.name}`, hint: d.active ? undefined : "Nonaktif" })),
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {draft.debtId
              ? "Nominal tiap bulan diambil dari Saldo & rencana per bulan di Hutang. Nominal default dipakai bila rencana bulan itu kosong."
              : "Hubungkan ke kartu/cicilan agar nominal bulanan ikut rencana bayar di Hutang."}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: !!v })} className="size-5" />
          Aktif
        </label>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9" onClick={() => setDraft(null)}>
            Batal
          </Button>
          <Button className="h-9" disabled={pending} onClick={save}>
            Simpan
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {dialog}
      <ul className="divide-y text-sm">
        {templates.map((t) =>
          draft?.id === t.id ? (
            <li key={t.id} className="py-2">
              {form}
            </li>
          ) : (
            <li key={t.id} className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-h-11 flex-1 items-center justify-between gap-3 py-2 text-left"
                onClick={() => setDraft({ ...t })}
              >
                <span className={t.active ? "" : "text-muted-foreground line-through"}>{t.name}</span>
                <span className="text-right text-muted-foreground">
                  {catName(t.categoryId)} · <span className="tabular-nums">{formatRupiah(t.defaultAmount)}</span>
                  {debtName(t.debtId) && (
                    <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-primary">
                      <Link2 className="size-3" aria-hidden /> Ikut rencana {debtName(t.debtId)}
                    </span>
                  )}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Hapus ${t.name}`}
                onClick={async () => {
                  if (!(await confirm(`Hapus template "${t.name}"? Transaksi yang sudah ada tidak terpengaruh.`, { confirmLabel: "Hapus" })))
                    return;
                  start(async () => {
                    const res = await deleteTemplate(t.id);
                    if (!res.ok) toast.error("Gagal menghapus");
                  });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ),
        )}
      </ul>
      {draft?.id === null ? (
        form
      ) : (
        <Button variant="outline" className="h-10" onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="size-4" /> Tambah item rutin
        </Button>
      )}
    </div>
  );
}
