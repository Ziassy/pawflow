"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BULAN_PENDEK, formatMonth, formatMonthLong, toMonthKey } from "@/lib/format";
import { cn } from "@/lib/utils";

const triggerCls =
  "flex h-10 w-full items-center gap-2 rounded-control border bg-background px-3 text-left text-base outline-none transition-colors hover:border-ring/60 focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:border-ring md:text-sm";

const navBtn = "grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

/**
 * Pemilih bulan: tombol berisi "Okt 2026", klik -> grid 12 bulan + navigasi tahun.
 * value/onChange memakai "YYYY-MM".
 */
export function MonthPicker({
  value,
  onChange,
  placeholder = "Pilih bulan",
  clearable,
  id,
  className,
  "aria-label": ariaLabel,
  compact,
  min,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  compact?: boolean;
  min?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = toMonthKey(new Date());
  const [year, setYear] = useState(Number((value ?? current).slice(0, 4)));

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setYear(Number((value ?? current).slice(0, 4)));
      }}
    >
      <PopoverTrigger id={id} aria-label={ariaLabel} className={cn(triggerCls, compact && "h-9 w-auto", className)}>
        <CalendarDays className="size-4 shrink-0 text-primary" />
        <span className={cn("flex-1 truncate font-medium", !value && "font-normal text-muted-foreground")}>
          {value ? (compact ? formatMonth(value) : formatMonthLong(value)) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] rounded-2xl p-3 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" className={navBtn} aria-label="Tahun sebelumnya" onClick={() => setYear(year - 1)}>
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-semibold tabular-nums">{year}</span>
          <button type="button" className={navBtn} aria-label="Tahun berikutnya" onClick={() => setYear(year + 1)}>
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5" role="grid">
          {BULAN_PENDEK.map((b, i) => {
            const key = `${year}-${String(i + 1).padStart(2, "0")}`;
            const selected = key === value;
            const isNow = key === current;
            const disabled = !!min && key < min;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={cn(
                  "h-10 rounded-control text-sm font-medium transition-colors disabled:opacity-30",
                  selected ? "bg-primary text-primary-foreground shadow-card" : "hover:bg-secondary",
                  !selected && isNow && "text-primary ring-1 ring-primary/40",
                )}
              >
                {b}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-2.5">
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-accent"
            onClick={() => {
              onChange(current);
              setOpen(false);
            }}
          >
            Bulan ini
          </button>
          {clearable && value && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-secondary"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X className="size-3.5" /> Kosongkan
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const BULAN_PANJANG_LIST = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * Pemilih tanggal: kalender bulanan, navigasi bulan, lompat tahun lewat dropdown.
 * value/onChange memakai "YYYY-MM-DD".
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  id,
  className,
  "aria-label": ariaLabel,
  yearRange = [1950, new Date().getFullYear() + 5],
  clearable,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
  yearRange?: [number, number];
  clearable?: boolean;
}) {
  const today = new Date();
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const base = value ? new Date(`${value}T00:00:00`) : today;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const yearPage = Math.floor(view.y / 12) * 12;

  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7; // Senin = 0
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (n: number) => {
    if (mode === "years") return setView({ ...view, y: view.y + n * 12 });
    if (mode === "months") return setView({ ...view, y: view.y + n });
    const d = new Date(view.y, view.m + n, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const label = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setView({ y: base.getFullYear(), m: base.getMonth() });
          setMode("days");
        }
      }}
    >
      <PopoverTrigger id={id} aria-label={ariaLabel} className={cn(triggerCls, className)}>
        <CalendarDays className="size-4 shrink-0 text-primary" />
        <span className={cn("flex-1 truncate font-medium", !value && "font-normal text-muted-foreground")}>{label}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-76 max-w-[calc(100vw-2rem)] rounded-2xl p-2.5 shadow-card sm:p-3">
        <div className="mb-2 flex items-center gap-1">
          <button type="button" className={navBtn} aria-label="Sebelumnya" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "days" ? "months" : mode === "months" ? "years" : "days")}
            className="flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors hover:bg-secondary"
            aria-label="Ganti tampilan bulan/tahun"
          >
            {mode === "days" && `${BULAN_PANJANG_LIST[view.m]} ${view.y}`}
            {mode === "months" && view.y}
            {mode === "years" && `${yearPage} – ${yearPage + 11}`}
          </button>
          <button type="button" className={navBtn} aria-label="Berikutnya" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </button>
        </div>
        {mode === "years" && (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => yearPage + i).map((y) => {
              const out = y < yearRange[0] || y > yearRange[1];
              return (
                <button
                  key={y}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setView({ ...view, y });
                    setMode("months");
                  }}
                  className={cn(
                    "h-10 rounded-control text-sm font-medium tabular-nums transition-colors disabled:opacity-30",
                    y === view.y ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                    y === today.getFullYear() && y !== view.y && "text-primary ring-1 ring-primary/40",
                  )}
                >
                  {y}
                </button>
              );
            })}
          </div>
        )}
        {mode === "months" && (
          <div className="grid grid-cols-3 gap-1.5">
            {BULAN_PENDEK.map((b, i) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setView({ ...view, m: i });
                  setMode("days");
                }}
                className={cn("h-10 rounded-control text-sm font-medium transition-colors", i === view.m ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}
              >
                {b}
              </button>
            ))}
          </div>
        )}
        {mode === "days" && (
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {HARI.map((h) => (
            <span key={h} className="py-1 text-[11px] font-medium text-muted-foreground">
              {h}
            </span>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <span key={`e${i}`} />;
            const key = iso(view.y, view.m, d);
            const selected = key === value;
            const isToday = key === todayIso;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                aria-label={new Date(view.y, view.m, d).toLocaleDateString("id-ID", { dateStyle: "full" })}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={cn(
                  "grid h-9 place-items-center rounded-lg text-sm tabular-nums transition-colors",
                  selected ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-secondary",
                  !selected && isToday && "font-semibold text-primary ring-1 ring-primary/40",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t pt-2.5">
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-accent"
            onClick={() => {
              onChange(todayIso);
              setOpen(false);
            }}
          >
            Hari ini
          </button>
          {clearable && value && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-secondary"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X className="size-3.5" /> Kosongkan
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
