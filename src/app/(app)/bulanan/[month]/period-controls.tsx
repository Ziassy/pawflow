"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ListPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RupiahInput } from "@/components/rupiah-input";
import { useConfirm } from "@/components/confirm-dialog";
import { addMissingTemplates, deletePeriod, updatePeriod } from "@/server/actions";
import { formatMonth } from "@/lib/format";
import { Segmented } from "@/components/ui-kit";

export function PeriodControls({
  periodId,
  month,
  salary,
  isPlan,
  note,
}: {
  periodId: number;
  month: string;
  salary: number | null;
  isPlan: boolean;
  note: string | null;
}) {
  const [salaryVal, setSalaryVal] = useState<number | null>(salary);
  const [lastSalary, setLastSalary] = useState(salary);
  // Gaji diubah dari tempat lain (dialog) -> ikut sinkron
  if (salary !== lastSalary) {
    setLastSalary(salary);
    setSalaryVal(salary);
  }
  const [noteVal, setNoteVal] = useState(note ?? "");
  const [pending, start] = useTransition();
  const [dialog, confirm] = useConfirm();

  const save = (data: Parameters<typeof updatePeriod>[0], msg?: string) =>
    start(async () => {
      const res = await updatePeriod(data);
      if (!res.ok) toast.error("error" in res ? res.error : "Gagal menyimpan");
      else if (msg) toast.success(msg);
    });

  return (
    <div className="grid gap-4 rounded-2xl border bg-card p-5 shadow-card sm:grid-cols-[minmax(0,20rem)_auto_1fr] sm:items-end">
      {dialog}
      <div className="space-y-1.5">
        <Label htmlFor="salary">Gaji</Label>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (salaryVal !== salary) save({ id: periodId, salary: salaryVal }, "Gaji disimpan");
          }}
        >
          <div className="min-w-0 flex-1">
            <RupiahInput id="salary" className="h-10 rounded-control text-base md:text-sm" value={salaryVal} onChange={setSalaryVal} />
          </div>
          {salaryVal !== salary && (
            <>
              <Button type="submit" className="h-10 rounded-control" disabled={pending}>
                Simpan
              </Button>
              <Button type="button" variant="ghost" className="h-10 rounded-control" onClick={() => setSalaryVal(salary)}>
                Batal
              </Button>
            </>
          )}
        </form>
      </div>
      <div className="space-y-1.5">
        <Label>Status bulan</Label>
        <Segmented
          aria-label="Status bulan"
          className="flex h-10"
          value={isPlan}
          disabled={pending}
          options={[
            { value: false, label: "Tercatat" },
            { value: true, label: "Rencana" },
          ]}
          onChange={(v) => save({ id: periodId, isPlan: v }, `Ditandai ${v ? "Rencana" : "Tercatat"}`)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Catatan bulan</Label>
        <Input
          id="note"
          className="h-10 text-base md:text-sm"
          value={noteVal}
          onChange={(e) => setNoteVal(e.target.value)}
          onBlur={() => noteVal !== (note ?? "") && save({ id: periodId, note: noteVal || null }, "Catatan disimpan")}
        />
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-4 sm:col-span-3">
        <Button
          variant="outline"
          className="h-9"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await addMissingTemplates(periodId);
              if (!res.ok) toast.error("error" in res ? res.error : "Gagal");
              else toast.success(res.added ? `${res.added} item template ditambahkan` : "Semua item template sudah ada");
            })
          }
        >
          <ListPlus className="size-4" /> Lengkapi dari template
        </Button>
        <Button
          variant="ghost"
          className="h-9 text-destructive sm:ml-auto"
          disabled={pending}
          onClick={async () => {
            const ok = await confirm(`Hapus ${formatMonth(month)} beserta semua transaksinya?`, {
              title: "Hapus bulan",
              confirmLabel: "Hapus",
              destructive: true,
            });
            if (ok) start(async () => { await deletePeriod(periodId); });
          }}
        >
          <Trash2 className="size-4" /> Hapus bulan
        </Button>
      </div>
    </div>
  );
}
