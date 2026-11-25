"use client";

import { useId, useState } from "react";
import { History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { categoryTheme } from "@/lib/category-theme";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export type NameSuggestion = { name: string; categoryId: number; amount: number | null };

/**
 * Input nama dengan saran (pengganti <datalist> bawaan browser):
 * muncul saat mengetik, panah ↑↓ + Enter untuk memilih, menampilkan kategori & nominal terakhir.
 */
export function NameAutocomplete({
  value,
  onChange,
  onPick,
  suggestions,
  categories,
  inputProps,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: NameSuggestion) => void;
  suggestions: NameSuggestion[];
  categories: { id: number; name: string; color?: string }[];
  inputProps?: Omit<React.ComponentProps<"input">, "value" | "onChange">;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const q = value.trim().toLowerCase();
  const matches = (q ? suggestions.filter((s) => s.name.toLowerCase().includes(q) && s.name.toLowerCase() !== q) : suggestions).slice(0, 7);
  const show = open && matches.length > 0;
  const catOf = (id: number) => categories.find((c) => c.id === id);

  const pick = (s: NameSuggestion) => {
    onPick(s);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        {...inputProps}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          setOpen(false);
          inputProps?.onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(matches.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && q) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border bg-popover p-1.5 shadow-card animate-in fade-in-0 slide-in-from-top-1"
        >
          {!q && <li className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Sering dipakai</li>}
          {matches.map((s, i) => {
            const cat = catOf(s.categoryId);
            const color = cat ? categoryTheme(cat.name, cat.color).color : undefined;
            return (
              <li key={s.name} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm", i === active && "bg-secondary")}
                >
                  <History className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                  {cat && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <span className="size-2 rounded-full" style={{ background: color }} />
                      {cat.name}
                    </span>
                  )}
                  {s.amount !== null && <span className="shrink-0 text-xs font-medium tabular-nums">{formatRupiah(s.amount)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
