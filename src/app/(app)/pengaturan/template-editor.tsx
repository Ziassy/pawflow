"use client";

import { categoryTheme } from "@/lib/category-theme";
import { Dropdown } from "@/components/dropdown";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RupiahInput } from "@/components/rupiah-input";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteTemplate, saveTemplate } from "@/server/actions";
import { formatRupiah } from "@/lib/format";

type Cat = { id: number; name: string };
type Tpl = { id: number; name: string; categoryId: number; defaultAmount: number | null; active: boolean };
type Draft = Omit<Tpl, "id"> & { id: number | null };

const EMPTY: Draft = { id: null, name: "", categoryId: 0, defaultAmount: null, active: true };

export function TemplateEditor({ templates, categories }: { templates: Tpl[]; categories: Cat[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, start] = useTransition();
  const [dialog, confirm] = useConfirm();
  const catName = (id: number) => categories.find((c) => c.id === id)?.name ?? "–";

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
