import Link from "next/link";
// Komponen tampilan bersama (design system aplikasi).
import { cn } from "@/lib/utils";
import { categoryTheme } from "@/lib/category-theme";
import { formatRupiah } from "@/lib/format";

/** Kartu dasar: putih, sudut membulat, border tipis, bayangan halus. */
export function Panel({
  className,
  title,
  description,
  action,
  children,
  padded = true,
}: {
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card shadow-card", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-48 flex-1">
            {title && <h2 className="text-[14px] font-semibold sm:text-[15px]">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn(padded && "p-4 sm:p-5", padded && (title || action) && "pt-3 sm:pt-4")}>{children}</div>
    </section>
  );
}

type Tone = "neutral" | "positive" | "negative" | "brand";

const TONE_ICON: Record<Tone, string> = {
  neutral: "bg-secondary text-foreground",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
  brand: "bg-accent text-accent-foreground",
};

/** Tile angka: label kecil, nilai besar, keterangan opsional. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card", className)}>
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        {Icon && (
          <span className={cn("grid size-7 place-items-center rounded-full", TONE_ICON[tone])}>
            <Icon className="size-3.5" />
          </span>
        )}
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight lg:text-[22px]">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Avatar bulat berwarna kategori dengan ikon. */
export function CategoryIcon({ name, color, size = "md" }: { name: string; color?: string; size?: "sm" | "md" }) {
  const t = categoryTheme(name, color);
  const Icon = t.icon;
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full", size === "md" ? "size-9" : "size-7")}
      style={{ background: `color-mix(in oklab, ${t.color} 14%, var(--card))`, color: t.color }}
    >
      <Icon className={size === "md" ? "size-4" : "size-3.5"} />
    </span>
  );
}

/** Titik warna kategori (legenda kecil). */
export function CategoryDot({ name, color }: { name: string; color?: string }) {
  return <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: categoryTheme(name, color).color }} />;
}

/** Nominal dengan warna tanda (negatif merah). */
export function Amount({ value, className, signed }: { value: number | null; className?: string; signed?: boolean }) {
  const neg = value !== null && value < 0;
  return (
    <span className={cn(neg && "text-negative", className)}>
      {signed && value !== null && value > 0 ? "+" : ""}
      {formatRupiah(value)}
    </span>
  );
}

/** Pil segmen (pilihan tunggal), dipakai untuk status bulan & sumber. */
export function Segmented<T extends string | boolean>({
  value,
  options,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex rounded-control bg-secondary p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !active && onChange(o.value)}
            className={cn(
              "h-8 flex-1 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors max-sm:h-9",
              active ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Tab berbasis URL (?tab=...), tampil seperti segmented control. */
export function TabLinks({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="mb-6 inline-flex max-w-full overflow-x-auto rounded-xl bg-secondary p-1" aria-label="Tab">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "flex h-9 items-center rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors",
            t.key === active ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Kartu utama bergradien biru dengan satu angka besar. */
export function HeroCard({
  label,
  value,
  badge,
  children,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl bg-linear-135 from-hero-from to-hero-to p-6 text-white shadow-card md:p-7",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.95 0.06 220), transparent 70%)" }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-white/85">{label}</span>
        {badge}
      </div>
      <div className="relative mt-3 text-[28px] leading-none font-semibold tracking-tight sm:text-[34px] lg:text-5xl">{value}</div>
      {children && <div className="relative">{children}</div>}
    </section>
  );
}

/** Progress bar tipis. */
export function Progress({ value, color, className, label }: { value: number | null; color?: string; className?: string; label?: string }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("h-2 overflow-hidden rounded-full bg-secondary", className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
