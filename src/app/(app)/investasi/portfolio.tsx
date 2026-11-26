"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/confirm-dialog";
import { Dropdown } from "@/components/dropdown";
import { Field, FormActions, FormDialog, useSubmit } from "@/components/form-dialog";
import { RupiahInput } from "@/components/rupiah-input";
import { EmptyState, Panel, Segmented } from "@/components/ui-kit";
import { formatInstantDay, formatPercent, formatRupiah } from "@/lib/format";
import { profitRatio } from "@/lib/investment";
import { cn } from "@/lib/utils";
import { deleteInvestment, saveInvestment } from "@/server/finance-actions";

type Opt = { id: number; name: string; color?: string };
type Row = {
  id: number;
  platformId: number | null;
  platform: string | null;
  assetTypeId: number | null;
  assetType: string | null;
  description: string | null;
  principal: number;
  currentValue: number | null;
  profit: number | null;
  updatedAt: string | null;
  color: string;
};
type Draft = { id: number | null; platformId: number | null; assetTypeId: number | null; description: string; principal: number | null; currentValue: number | null };

function ProfitPill({ value, size = "md" }: { value: number | null; size?: "sm" | "md" }) {
  const Icon = value === null || value === 0 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums",
        size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-[11px]",
        value === null ? "bg-secondary text-muted-foreground" : value > 0 ? "bg-positive-soft text-positive" : value < 0 ? "bg-negative-soft text-negative" : "bg-secondary text-muted-foreground",
      )}
    >
      <Icon className="size-3" />
      {value === null ? "–" : formatPercent(Math.abs(value), 2)}
    </span>
  );
}

function initials(s: string | null) {
  if (!s) return "?";
  return s
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export { ProfitPill };

export function PortfolioTable({ rows, platforms, assetTypes }: { rows: Row[]; platforms: Opt[]; assetTypes: Opt[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [view, setView] = useState<"kartu" | "tabel">("kartu");
  const [dialog, confirm] = useConfirm();
  const { pending, submit } = useSubmit();
  const close = () => setDraft(null);
  const edit = (r: Row) => setDraft({ id: r.id, platformId: r.platformId, assetTypeId: r.assetTypeId, description: r.description ?? "", principal: r.principal, currentValue: r.currentValue });
  const remove = async (r: Row) => {
    if (await confirm(`Hapus investasi "${r.description ?? r.assetType ?? ""}"${r.platform ? ` di ${r.platform}` : ""}?`, { confirmLabel: "Hapus", destructive: true }))
      submit(() => deleteInvestment(r.id), "Dihapus");
  };
  const date = (d: string | null) => (d ? formatInstantDay(d) : "–");
  const preview = draft ? profitRatio(draft.principal ?? 0, draft.currentValue) : null;

  return (
    <section>
      {dialog}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold sm:text-[15px]">Daftar investasi</h2>
          <p className="text-sm text-muted-foreground">Profit = (Nilai akhir − Modal) / Modal. Nilai akhir kosong → “–”.</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            aria-label="Tampilan"
            className="max-sm:hidden"
            value={view}
            onChange={setView}
            options={[
              { value: "kartu", label: "Kartu" },
              { value: "tabel", label: "Tabel" },
            ]}
          />
          <Button write className="h-9 rounded-control" onClick={() => setDraft({ id: null, platformId: null, assetTypeId: null, description: "", principal: null, currentValue: null })}>
            <Plus className="size-4" /> Tambah
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState>Belum ada investasi. Tambahkan posisi pertamamu.</EmptyState>
            ) : (
        <>
        {/* Di HP selalu kartu; pilihan Tabel hanya berlaku di layar >= 640px */}
        <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", view === "tabel" && "sm:hidden")}>
          {rows.map((r) => {
            const value = r.currentValue ?? r.principal;
            const ratio = r.principal > 0 ? Math.min(1.5, value / r.principal) : null;
            return (
              <article key={r.id} className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: r.color }} />
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-bold"
                    style={{ background: `color-mix(in oklab, ${r.color} 14%, white)`, color: r.color }}
                  >
                    {initials(r.platform ?? r.assetType)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-semibold">{r.description || r.assetType || "Tanpa keterangan"}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{r.platform ?? "Tanpa platform"}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-px font-medium" style={{ background: `color-mix(in oklab, ${r.color} 12%, transparent)`, color: r.color }}>
                        {r.assetType ?? "Tanpa jenis"}
                      </span>
                    </div>
                  </div>
                  <div className="flex opacity-60 transition-opacity group-hover:opacity-100">
                    <Button write variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => edit(r)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button write variant="ghost" size="icon-sm" aria-label="Hapus" onClick={() => remove(r)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-muted-foreground">{r.currentValue === null ? "Nilai (pakai modal)" : "Nilai sekarang"}</div>
                    <div className="text-xl font-semibold tracking-tight">{formatRupiah(value)}</div>
                  </div>
                  <ProfitPill value={r.profit} />
                </div>
                <div className="mt-3">
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
                    {ratio !== null && (
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (ratio / 1.5) * 100)}%`, background: (r.profit ?? 0) < 0 ? "var(--negative)" : r.color }}
                      />
                    )}
                    <span aria-hidden className="absolute top-0 bottom-0 w-px bg-foreground/30" style={{ left: `${(1 / 1.5) * 100}%` }} title="Modal" />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>Modal {formatRupiah(r.principal)}</span>
                    <span>{date(r.updatedAt)}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {view === "tabel" && (
        <Panel padded={false} className="hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Platform</th>
                  <th className="px-3 py-3 text-left font-medium">Keterangan</th>
                  <th className="px-3 py-3 text-left font-medium">Jenis</th>
                  <th className="px-3 py-3 text-right font-medium">Modal awal</th>
                  <th className="px-3 py-3 text-right font-medium">Nilai akhir</th>
                  <th className="px-3 py-3 text-right font-medium">Profit</th>
                  <th className="px-3 py-3 text-right font-medium">Update</th>
                  <th className="w-20 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-secondary/40">
                    <td className="px-5 py-2.5 font-medium">{r.platform ?? "–"}</td>
                    <td className="px-3 py-2.5">{r.description ?? "–"}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: r.color }} />
                        {r.assetType ?? <span className="text-muted-foreground">Tanpa jenis</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatRupiah(r.principal)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatRupiah(r.currentValue)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <ProfitPill value={r.profit} size="sm" />
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{date(r.updatedAt)}</td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <Button write variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => edit(r)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button write variant="ghost" size="icon-sm" aria-label="Hapus" onClick={() => remove(r)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        )}
        </>
      )}

      <FormDialog
        icon={TrendingUp}
        title={draft?.id ? "Edit investasi" : "Tambah investasi"}
        description="Catat modal awal dan nilai terbaru."
        open={!!draft}
        onOpenChange={(o) => !o && close()}
      >
        {draft && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(
                () =>
                  saveInvestment(draft.id, {
                    platformId: draft.platformId,
                    assetTypeId: draft.assetTypeId,
                    description: draft.description || null,
                    principal: draft.principal ?? 0,
                    currentValue: draft.currentValue,
                  }),
                "Tersimpan",
                close,
              );
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Platform" htmlFor="inv-platform">
                <Dropdown
                  id="inv-platform"
                  placeholder="Pilih platform"
                  emptyLabel="Tanpa platform"
                  value={draft.platformId ? String(draft.platformId) : null}
                  onChange={(v) => setDraft({ ...draft, platformId: v ? Number(v) : null })}
                  options={platforms.map((p) => ({ value: String(p.id), label: p.name }))}
                />
              </Field>
              <Field label="Jenis" htmlFor="inv-type">
                <Dropdown
                  id="inv-type"
                  placeholder="Pilih jenis"
                  emptyLabel="Tanpa jenis"
                  value={draft.assetTypeId ? String(draft.assetTypeId) : null}
                  onChange={(v) => setDraft({ ...draft, assetTypeId: v ? Number(v) : null })}
                  options={assetTypes.map((p) => ({ value: String(p.id), label: p.name, color: p.color }))}
                />
              </Field>
            </div>
            <Field label="Keterangan" htmlFor="inv-desc">
              <Input id="inv-desc" className="h-10 rounded-control" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="mis. BBCA, BBRI" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Modal awal" htmlFor="inv-principal">
                <RupiahInput id="inv-principal" className="h-10 rounded-control" value={draft.principal} onChange={(v) => setDraft({ ...draft, principal: v })} />
              </Field>
              <Field label="Nilai akhir" htmlFor="inv-value" hint="Kosongkan jika belum tahu">
                <RupiahInput id="inv-value" className="h-10 rounded-control" value={draft.currentValue} onChange={(v) => setDraft({ ...draft, currentValue: v })} />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3 text-sm">
              <span className="text-muted-foreground">Perkiraan profit</span>
              <ProfitPill value={preview} />
            </div>
            <FormActions pending={pending} onCancel={close} />
          </form>
        )}
      </FormDialog>
    </section>
  );
}
