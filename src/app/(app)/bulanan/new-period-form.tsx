"use client";

import { MonthPicker } from "@/components/date-pickers";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, FileText, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui-kit";
import { createPeriod } from "@/server/actions";
import { cn } from "@/lib/utils";

const SOURCES = [
  { value: "template", label: "Dari template", hint: "Isi item rutin", icon: LayoutTemplate },
  { value: "copyPrev", label: "Salin bulan lalu", hint: "Semua transaksi & gaji", icon: Copy },
  { value: "empty", label: "Kosong", hint: "Mulai dari nol", icon: FileText },
] as const;

export function NewPeriodForm({ defaultMonth, existing }: { defaultMonth: string; existing: string[] }) {
  const [month, setMonth] = useState(defaultMonth);
  const [source, setSource] = useState<(typeof SOURCES)[number]["value"]>("template");
  const [isPlan, setIsPlan] = useState(false);
  const [pending, start] = useTransition();
  const exists = existing.includes(month);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          // Berhasil -> redirect ke halaman bulan; hanya error yang kembali
          const res = await createPeriod({ month, isPlan, source });
          if (res && !res.ok && "error" in res) toast.error(res.error);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="month">Bulan</Label>
        <MonthPicker id="month" value={month} onChange={(v) => v && setMonth(v)} className={exists ? "border-destructive" : undefined} />
        {exists && <p className="text-sm text-destructive">Bulan ini sudah ada.</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Segmented
          aria-label="Status bulan"
          className="flex h-10 w-full"
          value={isPlan}
          options={[
            { value: false, label: "Tercatat" },
            { value: true, label: "Rencana" },
          ]}
          onChange={setIsPlan}
        />
      </div>
      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium">Isi awal</legend>
        <div className="space-y-2">
          {SOURCES.map((s) => {
            const active = source === s.value;
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSource(s.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  active ? "border-primary bg-secondary" : "hover:bg-secondary/60",
                )}
              >
                <span className={cn("grid size-8 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <Button write type="submit" className="h-10 w-full rounded-control" disabled={pending || exists || !month}>
        {pending ? "Membuat…" : "Buat bulan"}
      </Button>
    </form>
  );
}
