"use client";

import { Dropdown } from "@/components/dropdown";
import { useState } from "react";
import { AlertTriangle, CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditableMoneyCell } from "@/components/editable-money";
import { useSubmit } from "@/components/form-dialog";
import { Panel } from "@/components/ui-kit";
import { changeRatio, isBigDrop } from "@/lib/investment";
import { formatBps, formatMonth, formatPercent, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { copyAssetsFromPrevious, setAssetMonthNote, setAssetSnapshot } from "@/server/finance-actions";

export function AssetTracker({
  months,
  current,
  assetTypes,
  cells,
  totals,
  notes,
  dropBps,
}: {
  months: string[];
  current: string;
  assetTypes: { id: number; name: string; color: string }[];
  cells: { month: string; assetTypeId: number; value: number }[];
  totals: Record<string, number | null>;
  notes: Record<string, string>;
  dropBps: number;
}) {
  const [target, setTarget] = useState(current);
  const { pending, submit } = useSubmit();
  const val = (m: string, id: number) => cells.find((c) => c.month === m && c.assetTypeId === id)?.value ?? null;
  const shown = [...months].reverse(); // terbaru di kiri
  const drops = months.filter((m, i) => i > 0 && isBigDrop(totals[months[i - 1]], totals[m], dropBps));

  return (
    <div className="space-y-6">
      {drops.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-negative/30 bg-negative-soft p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-negative">
            <AlertTriangle className="size-4" /> Total aset turun lebih dari {formatBps(dropBps)}
          </p>
          {drops.map((m) => (
            <DropNote key={m} month={m} prev={totals[months[months.indexOf(m) - 1]]} curr={totals[m]} note={notes[m] ?? ""} />
          ))}
        </div>
      )}

      <Panel
        padded={false}
        title="Asset Tracker"
        description="Nilai per jenis aset tiap bulan. Sel kosong = belum diisi (tidak dihitung 0)."
        action={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Dropdown
              aria-label="Bulan tujuan"
              size="sm"
              className="min-w-28 flex-1 sm:w-36 sm:flex-none"
              align="end"
              value={target}
              onChange={(v) => v && setTarget(v)}
              options={shown.map((m) => ({ value: m, label: formatMonth(m), hint: totals[m] === null ? "Masih kosong" : undefined }))}
            />
            <Button
              variant="outline"
              className="h-9 rounded-control"
              disabled={pending}
              onClick={() =>
                submit(async () => {
                  const r = await copyAssetsFromPrevious(target);
                  if (r.ok) toast.success(r.copied ? `${r.copied} nilai disalin ke ${formatMonth(target)}` : "Tidak ada sel kosong untuk diisi");
                  return r;
                })
              }
            >
              <CopyPlus className="size-4" /> <span className="sm:hidden">Salin bln lalu</span>
              <span className="hidden sm:inline">Salin dari bulan lalu</span>
            </Button>
          </div>
        }
      >
        <div className="mt-4 max-h-[70vh] overflow-auto border-t">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-secondary text-xs text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-20 bg-secondary px-3 py-2.5 text-left font-medium sm:min-w-40 sm:px-4 sm:py-3">Jenis aset</th>
                {shown.map((m) => (
                  <th key={m} className={cn("px-2 py-2.5 text-right font-medium whitespace-nowrap sm:py-3", m === current && "text-primary")}>
                    {formatMonth(m)}
                    {totals[m] === null && <span className="block text-[11px] font-normal text-warning">kosong</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {assetTypes.map((t) => (
                <tr key={t.id}>
                  <td className="sticky left-0 z-10 max-w-32 bg-card px-3 py-1 font-medium sm:max-w-none sm:px-4 sm:whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: t.color }} />
                      {t.name}
                    </span>
                  </td>
                  {shown.map((m) => (
                    <td key={m} className={cn("px-1 py-1", totals[m] === null && "bg-warning-soft/40")}>
                      <EditableMoneyCell label={`${t.name} ${formatMonth(m)}`} value={val(m, t.id)} allowNegative onSave={(v) => setAssetSnapshot(m, t.id, v)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 bg-secondary text-sm">
              <tr className="font-semibold">
                <td className="sticky left-0 z-30 bg-secondary px-3 py-3 sm:px-4">Total</td>
                {shown.map((m) => (
                  <td key={m} className="px-3 py-3 text-right tabular-nums">
                    {totals[m] === null ? <span className="text-muted-foreground">–</span> : formatRupiah(totals[m])}
                  </td>
                ))}
              </tr>
              <tr className="text-xs">
                <td className="sticky left-0 z-30 bg-secondary px-3 pb-3 text-muted-foreground sm:px-4">vs bulan lalu</td>
                {shown.map((m) => {
                  const i = months.indexOf(m);
                  const r = i > 0 ? changeRatio(totals[months[i - 1]], totals[m]) : null;
                  const big = i > 0 && isBigDrop(totals[months[i - 1]], totals[m], dropBps);
                  return (
                    <td key={m} className={cn("px-3 pb-3 text-right tabular-nums", r === null ? "text-muted-foreground" : r < 0 ? "text-negative" : "text-positive", big && "font-bold")}>
                      {r === null ? "–" : `${r > 0 ? "+" : ""}${formatPercent(r, 1)}`}
                      {big && " ⚠"}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function DropNote({ month, prev, curr, note }: { month: string; prev: number | null; curr: number | null; note: string }) {
  const [text, setText] = useState(note);
  const { pending, submit } = useSubmit();
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        submit(() => setAssetMonthNote(month, text), "Catatan disimpan");
      }}
    >
      <span className="text-sm sm:w-72">
        <b>{formatMonth(month)}</b>: {formatRupiah(prev)} → {formatRupiah(curr)} ({formatPercent(changeRatio(prev, curr), 1)})
      </span>
      <Input aria-label={`Alasan ${formatMonth(month)}`} placeholder="Alasan (mis. ambil dana darurat)" className="h-9 flex-1 rounded-control bg-card" value={text} onChange={(e) => setText(e.target.value)} />
      <Button type="submit" variant="outline" className="h-9 rounded-control bg-card" disabled={pending || text === note}>
        Simpan
      </Button>
    </form>
  );
}
