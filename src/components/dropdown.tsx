"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: string;
  hint?: string;
  color?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

/**
 * Dropdown modern pengganti <select>: tombol + daftar di popover,
 * cari otomatis jika opsi banyak, navigasi panah, dan `name` untuk form.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Pilih…",
  emptyLabel,
  name,
  id,
  className,
  size = "md",
  searchable,
  align = "start",
  "aria-label": ariaLabel,
  invalid,
}: {
  value: string | null;
  onChange?: (v: string | null) => void;
  options: DropdownOption[];
  placeholder?: string;
  /** Jika diisi, muncul opsi teratas untuk mengosongkan (mis. "Semua kategori"). */
  emptyLabel?: string;
  name?: string;
  id?: string;
  className?: string;
  size?: "sm" | "md";
  searchable?: boolean;
  align?: "start" | "end" | "center";
  "aria-label"?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [internal, setInternal] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  // Nilai dari luar berubah (mis. URL filter) -> ikut
  if (value !== lastValue) {
    setLastValue(value);
    setInternal(value);
  }
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = onChange ? value : internal;
  const selected = options.find((o) => o.value === current);
  const showSearch = searchable ?? options.length > 8;

  const all = useMemo(() => (emptyLabel ? [{ value: "", label: emptyLabel } as DropdownOption, ...options] : options), [emptyLabel, options]);
  const filtered = q ? all.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : all;

  const pick = (v: string) => {
    const next = v === "" ? null : v;
    if (onChange) onChange(next);
    else setInternal(next);
    setOpen(false);
    setQ("");
  };

  const move = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
    items[next]?.focus();
  };

  const Icon = selected?.icon;

  return (
    <>
      {name && <input type="hidden" name={name} value={current ?? ""} />}
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ("");
        }}
      >
        <PopoverTrigger
          id={id}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          className={cn(
            "group flex w-full items-center gap-2 rounded-control border bg-background text-left outline-none transition-colors",
            "hover:border-ring/60 focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:border-ring data-popup-open:ring-3 data-popup-open:ring-ring/20",
            "aria-invalid:border-destructive",
            size === "md" ? "h-10 px-3 text-base md:text-sm" : "h-9 px-2.5 text-sm",
            className,
          )}
        >
          {selected?.color && <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: selected.color }} />}
          {Icon && <Icon className="size-4 shrink-0 text-primary" />}
          <span className={cn("flex-1 truncate", selected ? "font-medium" : "text-muted-foreground")}>{selected?.label ?? (current === null && emptyLabel ? emptyLabel : placeholder)}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-popup-open:rotate-180" />
        </PopoverTrigger>
        <PopoverContent align={align} className="w-(--anchor-width) min-w-56 gap-1 rounded-2xl p-1.5 shadow-card">
          {showSearch && (
            <div className="relative mb-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    listRef.current?.querySelector<HTMLButtonElement>("[role=option]")?.focus();
                  }
                  if (e.key === "Enter" && filtered[0]) {
                    e.preventDefault();
                    pick(filtered[0].value);
                  }
                }}
                placeholder="Cari…"
                aria-label="Cari opsi"
                className="h-9 w-full rounded-lg bg-secondary pr-2 pl-8 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          )}
          <div ref={listRef} id={listId} role="listbox" onKeyDown={move} className="max-h-72 overflow-y-auto">
            {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Tidak ditemukan</p>}
            {filtered.map((o) => {
              const active = (o.value === "" ? null : o.value) === current;
              const OIcon = o.icon;
              return (
                <button
                  key={o.value || "__empty"}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm outline-none transition-colors",
                    "hover:bg-secondary focus-visible:bg-secondary",
                    active && "bg-accent text-accent-foreground",
                    o.value === "" && "text-muted-foreground",
                  )}
                >
                  {o.color ? (
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: o.color }} />
                  ) : OIcon ? (
                    <OIcon className="size-4 shrink-0" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate", active && "font-semibold")}>{o.label}</span>
                    {o.hint && <span className="block truncate text-xs text-muted-foreground">{o.hint}</span>}
                  </span>
                  {active && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
