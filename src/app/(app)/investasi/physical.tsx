"use client";

import { useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/confirm-dialog";
import { Field, FormActions, FormDialog, useSubmit } from "@/components/form-dialog";
import { RupiahInput } from "@/components/rupiah-input";
import { EmptyState, Panel } from "@/components/ui-kit";
import { formatRupiah } from "@/lib/format";
import { deletePhysicalAsset, savePhysicalAsset } from "@/server/finance-actions";

type Item = { id: number; name: string; value: number; note: string | null };
type Draft = { id: number | null; name: string; value: number | null; note: string };

export function PhysicalAssets({ items }: { items: Item[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dialog, confirm] = useConfirm();
  const { pending, submit } = useSubmit();
  const close = () => setDraft(null);
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <Panel
      padded={false}
      title="Aset fisik"
      action={
        <Button className="h-9 rounded-control" onClick={() => setDraft({ id: null, name: "", value: null, note: "" })}>
          <Plus className="size-4" /> Tambah
        </Button>
      }
    >
      {dialog}
      {items.length === 0 ? (
        <div className="p-5">
          <EmptyState>Belum ada aset fisik.</EmptyState>
        </div>
      ) : (
        <ul className="mt-3 divide-y border-t">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-5 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Package className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{i.name}</span>
                {i.note && <span className="block truncate text-xs text-muted-foreground">{i.note}</span>}
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatRupiah(i.value)}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${i.name}`} onClick={() => setDraft({ id: i.id, name: i.name, value: i.value, note: i.note ?? "" })}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus ${i.name}`}
                onClick={async () => {
                  if (await confirm(`Hapus "${i.name}"?`, { confirmLabel: "Hapus" })) submit(() => deletePhysicalAsset(i.id), "Dihapus");
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
          <li className="flex justify-between bg-secondary/60 px-5 py-3 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatRupiah(total)}</span>
          </li>
        </ul>
      )}
      <FormDialog icon={Package} description="Barang berharga: gadget, kendaraan, dll." title={draft?.id ? "Edit aset fisik" : "Tambah aset fisik"} open={!!draft} onOpenChange={(o) => !o && close()}>
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit(() => savePhysicalAsset(draft.id, { name: draft.name, value: draft.value ?? 0, note: draft.note || null }), "Tersimpan", close);
            }}
          >
            <Field label="Nama" htmlFor="pa-name">
              <Input id="pa-name" className="h-10 rounded-control" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Nilai" htmlFor="pa-value">
              <RupiahInput id="pa-value" className="h-10 rounded-control" value={draft.value} onChange={(v) => setDraft({ ...draft, value: v })} />
            </Field>
            <Field label="Catatan" htmlFor="pa-note">
              <Input id="pa-note" className="h-10 rounded-control" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </Field>
            <FormActions pending={pending} onCancel={close} />
          </form>
        )}
      </FormDialog>
    </Panel>
  );
}
