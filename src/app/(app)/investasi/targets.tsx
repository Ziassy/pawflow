"use client";

import { MonthPicker } from "@/components/date-pickers";
import { useRouter } from "next/navigation";
import { signalNavigate } from "@/components/nav-progress";
import { EditableMoneyCell } from "@/components/editable-money";
import { Panel, Progress } from "@/components/ui-kit";
import { formatMonth, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setPortfolioTarget } from "@/server/finance-actions";

type Row = { assetTypeId: number; name: string; color: string; target: number | null; realized: number | null; value: number | null };

export function PortfolioTargets({ month, rows, prevLabel }: { month: string; rows: Row[]; prevLabel: string }) {
  const router = useRouter();
  const withTarget = rows.filter((r) => r.target !== null);
  const totalTarget = withTarget.reduce((s, r) => s + (r.target ?? 0), 0);
  const totalReal = withTarget.reduce((s, r) => s + (r.realized ?? 0), 0);

  return (
    <Panel
      padded={false}
      title={`Target portofolio ${formatMonth(month)}`}
      description={`Realisasi = kenaikan nilai di Asset Tracker dibanding ${prevLabel}.`}
      action={
        <MonthPicker compact aria-label="Bulan" value={month} onChange={(v) => {
            if (!v) return;
            signalNavigate();
            router.push(`/investasi?tab=target&bulan=${v}`);
          }} />
      }
    >
      {/* HP: satu kartu per jenis; tabel mulai 640px */}
      <ul className="mt-3 divide-y border-t sm:hidden">
        {rows.map((r) => {
          const ratio = r.target && r.realized !== null ? r.realized / r.target : null;
          return (
            <li key={r.assetTypeId} className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="truncate">{r.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">Nilai {formatRupiah(r.value)}</span>
              </div>
              <div className="grid grid-cols-2 items-end gap-3 text-sm">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Target</div>
                  <EditableMoneyCell label={`Target ${r.name}`} value={r.target} className="border-border bg-background" onSave={(v) => setPortfolioTarget(month, r.assetTypeId, v)} />
                </div>
                <div className="pb-2 text-right">
                  <div className="text-xs text-muted-foreground">Realisasi</div>
                  <div className={cn("tabular-nums", r.realized === null ? "text-muted-foreground" : r.realized < 0 && "text-negative")}>{r.realized === null ? "–" : formatRupiah(r.realized)}</div>
                </div>
              </div>
              {r.target !== null && <Progress value={ratio} color={ratio !== null && ratio >= 1 ? "var(--positive)" : r.color} label={`Progres ${r.name}`} />}
            </li>
          );
        })}
        <li className="flex items-center justify-between gap-3 bg-secondary px-4 py-3 text-sm font-semibold">
          <span>Total (yang punya target)</span>
          <span className="shrink-0 text-right tabular-nums">
            {formatRupiah(totalReal)}
            <span className="block text-xs font-normal text-muted-foreground">dari {formatRupiah(totalTarget)}</span>
          </span>
        </li>
      </ul>
      <div className="mt-4 hidden overflow-x-auto border-t sm:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2.5 text-left font-medium">Jenis</th>
              <th className="px-3 py-2.5 text-right font-medium">Target</th>
              <th className="px-3 py-2.5 text-right font-medium">Realisasi</th>
              <th className="min-w-36 px-3 py-2.5 text-left font-medium">Progres</th>
              <th className="px-5 py-2.5 text-right font-medium">Nilai bulan ini</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => {
              const ratio = r.target && r.realized !== null ? r.realized / r.target : null;
              return (
                <tr key={r.assetTypeId}>
                  <td className="px-5 py-1.5 font-medium whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </span>
                  </td>
                  <td className="w-40 px-1 py-1.5">
                    <EditableMoneyCell label={`Target ${r.name}`} value={r.target} onSave={(v) => setPortfolioTarget(month, r.assetTypeId, v)} />
                  </td>
                  <td className={cn("px-3 py-1.5 text-right tabular-nums", r.realized === null ? "text-muted-foreground" : r.realized < 0 && "text-negative")}>
                    {r.realized === null ? "–" : formatRupiah(r.realized)}
                  </td>
                  <td className="px-3 py-1.5">{r.target !== null && <Progress value={ratio} color={ratio !== null && ratio >= 1 ? "var(--positive)" : r.color} label={`Progres ${r.name}`} />}</td>
                  <td className="px-5 py-1.5 text-right tabular-nums">{formatRupiah(r.value)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-secondary font-semibold">
            <tr>
              <td className="px-5 py-3">Total (yang punya target)</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatRupiah(totalTarget)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatRupiah(totalReal)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}
