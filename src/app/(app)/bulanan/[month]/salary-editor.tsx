"use client";

import { useState } from "react";
import { Pencil, Wallet } from "lucide-react";
import { FormActions, FormDialog, useSubmit } from "@/components/form-dialog";
import { RupiahInput } from "@/components/rupiah-input";
import { formatMonth, formatMonthLong, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { updatePeriod } from "@/server/actions";

/** Tombol "Ubah gaji" + dialog. Dipakai di kartu utama bulan. */
export function SalaryEditor({
  periodId,
  month,
  salary,
  prev,
  variant = "hero",
}: {
  periodId: number;
  month: string;
  salary: number | null;
  prev: { month: string; salary: number | null } | null;
  variant?: "hero" | "plain";
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | null>(salary);
  const { pending, submit, readOnly } = useSubmit();
  const suggestions = [
    prev?.salary ? { label: `Sama dengan ${formatMonth(prev.month)}`, value: prev.salary } : null,
    salary !== null ? { label: "Kosongkan", value: null } : null,
  ].filter((x): x is { label: string; value: number | null } => x !== null);

  return (
    <>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => {
          setValue(salary);
          setOpen(true);
        }}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors max-sm:min-h-9 disabled:cursor-not-allowed disabled:opacity-50",
          variant === "hero" ? "bg-white/15 px-3 py-1.5 text-white hover:bg-white/25" : "bg-accent px-3 py-1.5 text-accent-foreground hover:bg-accent/70",
        )}
      >
        <Pencil className="size-3" />
        <span className="sm:hidden">{salary === null ? "Isi" : "Ubah"}</span>
        <span className="hidden sm:inline">{salary === null ? "Isi gaji" : "Ubah gaji"}</span>
      </button>
      <FormDialog icon={Wallet} title="Gaji bulan ini" description={formatMonthLong(month)} open={open} onOpenChange={setOpen}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit(() => updatePeriod({ id: periodId, salary: value }), value === null ? "Gaji dikosongkan" : `Gaji ${formatRupiah(value)} disimpan`, () => setOpen(false));
          }}
        >
          <RupiahInput aria-label="Gaji" autoFocus className="h-14 rounded-2xl text-2xl font-semibold md:text-2xl" value={value} onChange={setValue} placeholder="0" />
          <p className="text-xs text-muted-foreground">Ketik angka saja, titik muncul otomatis. Bisa juga 14,2jt.</p>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setValue(s.value)}
                  className="rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary"
                >
                  {s.label}
                  {s.value !== null && <span className="ml-1 font-semibold">{formatRupiah(s.value)}</span>}
                </button>
              ))}
            </div>
          )}
          <FormActions pending={pending} disabled={value === salary} onCancel={() => setOpen(false)} label="Simpan gaji" />
        </form>
      </FormDialog>
    </>
  );
}
