"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bagian yang bisa dibuka-tutup dengan animasi tinggi (tanpa JS pengukur).
 * Dipakai di kartu agar detail/input/aksi tidak memanjangkan halaman.
 */
export function Disclosure({
  open,
  onOpenChange,
  label,
  hint,
  children,
  className,
  icon: Icon,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const id = useId();
  return (
    <div className={cn("border-t", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex min-h-12 w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors sm:px-5",
          open ? "bg-accent/60 text-accent-foreground" : "text-primary hover:bg-secondary/60",
        )}
      >
        {Icon && <Icon className="size-4 shrink-0" />}
        <span className="flex-1">{label}</span>
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
        <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div id={id} className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="min-h-0 overflow-hidden" inert={!open}>
          {children}
        </div>
      </div>
    </div>
  );
}
