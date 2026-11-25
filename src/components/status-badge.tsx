import { cn } from "@/lib/utils";
import type { PeriodStatus } from "@/lib/constants";

const STYLES: Record<PeriodStatus, { cls: string; dot: string }> = {
  Tercatat: { cls: "bg-positive-soft text-positive", dot: "bg-positive" },
  Rencana: { cls: "bg-accent text-accent-foreground", dot: "bg-brand" },
  "Tidak lengkap": { cls: "bg-warning-soft text-warning", dot: "bg-warning" },
};

export function StatusBadge({ status, className }: { status: PeriodStatus; className?: string }) {
  const s = STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", s.cls, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {status}
    </span>
  );
}

/** Warna untuk angka: negatif merah. */
export function signClass(n: number) {
  return n < 0 ? "text-negative" : "";
}
