"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, CalendarArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/date-pickers";
import { Field, FormActions, FormDialog, useDialog, useSubmit } from "@/components/form-dialog";
import { formatMonth, formatRupiah, toMonthKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { writePortfolioToTracker } from "@/server/finance-actions";

type Row = { assetTypeId: number; name: string; color: string; value: number };

/**
 * Tombol + dialog: tulis Total per jenis ke Asset Tracker untuk satu bulan.
 * Pratinjau menunjukkan nilai tracker yang sudah ada sebelum ditimpa.
 */
export function PortfolioToTracker({
  rows,
  unassigned,
  snapshots,
}: {
  rows: Row[];
  /** Nilai posisi tanpa jenis aset (tidak ikut ditulis) */
  unassigned: number;
  /** month -> assetTypeId -> nilai tracker saat ini */
  snapshots: Record<string, Record<number, number>>;
}) {
  const dialog = useDialog();
  const { pending, submit } = useSubmit();
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const existing = snapshots[month] ?? {};
  const replaced = rows.filter((r) => existing[r.assetTypeId] !== undefined && existing[r.assetTypeId] !== r.value).length;

  return (
    <FormDialog
      icon={CalendarArrowDown}
      title="Tulis ke Asset Tracker"
      description="Nilai per jenis di portofolio disimpan sebagai nilai aset bulan yang dipilih."
      open={dialog.open}
      onOpenChange={dialog.setOpen}
      trigger={
        <Button variant="outline" size="sm" onClick={dialog.show} disabled={!rows.length}>
          <CalendarArrowDown aria-hidden /> Tulis ke Asset Tracker
        </Button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(
            async () => {
              const r = await writePortfolioToTracker(month);
              if (r.ok) toast.success(`${r.written} jenis aset ditulis ke ${formatMonth(month)}`);
              return r;
            },
            undefined,
            dialog.hide,
          );
        }}
      >
        <Field label="Bulan" htmlFor="sync-month">
          <MonthPicker id="sync-month" value={month} onChange={(v) => v && setMonth(v)} />
        </Field>

        <div>
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">Nilai yang akan disimpan</p>
          <ul className="divide-y rounded-control border">
            {rows.map((r) => {
              const before = existing[r.assetTypeId];
              const same = before === r.value;
              return (
                <li key={r.assetTypeId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                    <span className="truncate">{r.name}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end tabular-nums">
                    <span className="font-semibold">{formatRupiah(r.value)}</span>
                    <span className={cn("flex items-center gap-1 text-xs", before !== undefined && !same ? "text-warning" : "text-muted-foreground")}>
                      {before === undefined ? (
                        "Sel masih kosong"
                      ) : same ? (
                        "Sama dengan tracker"
                      ) : (
                        `Mengganti ${formatRupiah(before)}`
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {replaced > 0 && (
            <p className="mt-2 text-xs text-warning">
              {replaced} nilai di {formatMonth(month)} akan ditimpa. Jenis lain di bulan itu tidak berubah.
            </p>
          )}
          {unassigned > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {formatRupiah(unassigned)} dari posisi tanpa jenis aset tidak ikut ditulis. Isi jenisnya di tabel portofolio agar ikut tercatat.
            </p>
          )}
        </div>

        <FormActions
          pending={pending}
          onCancel={dialog.hide}
          label="Tulis"
          extra={
            <Link href={`/investasi?tab=tracker`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Buka Asset Tracker <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        />
      </form>
    </FormDialog>
  );
}
