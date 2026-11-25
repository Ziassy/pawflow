"use client";

import { useRouter } from "next/navigation";
import { signalNavigate } from "@/components/nav-progress";
import { MonthPicker as Picker } from "@/components/date-pickers";

/** Pemilih "Bulan acuan" dashboard. */
export function MonthPicker({ value }: { value: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-muted-foreground sm:inline">Bulan acuan</span>
      <Picker aria-label="Bulan acuan" className="w-48 bg-card shadow-card" value={value} onChange={(v) => {
          if (!v) return;
          signalNavigate();
          router.push(`/?bulan=${v}`);
        }} />
    </div>
  );
}
