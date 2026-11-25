"use client";

import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryTheme } from "@/lib/category-theme";
import { cn } from "@/lib/utils";
import { formatMonth, formatPercent, formatRupiah, formatRupiahShort } from "@/lib/format";

const TICK = { fontSize: 11, fill: "var(--muted-foreground)" };

function TooltipBox({ title, rows }: { title?: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="min-w-40 rounded-xl border bg-popover px-3 py-2 text-xs shadow-card">
      {title && <div className="mb-1 font-medium">{title}</div>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-medium tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Donut komposisi pengeluaran per kategori. */
export function SpendingDonut({ data, total }: { data: { name: string; value: number; color?: string }[]; total: number }) {
  return (
    <Donut
      total={total}
      centerLabel="Total keluar"
      empty="Belum ada pengeluaran."
      data={data.map((d) => ({ name: d.name, value: d.value, fill: categoryTheme(d.name, d.color).color }))}
    />
  );
}

/** Donut generik + legenda berlabel nilai & persen (pengganti kontras rendah). */
export function Donut({
  data,
  total,
  centerLabel,
  empty,
}: {
  data: { name: string; value: number; fill: string }[];
  total: number;
  centerLabel: string;
  empty: string;
}) {
  const rows = data.filter((d) => d.value > 0);
  if (rows.length === 0 || total <= 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={1.5}
              stroke="var(--card)"
              strokeWidth={2}
              cornerRadius={4}
              isAnimationActive={false}
            >
              {rows.map((r) => (
                <Cell key={r.name} fill={r.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <TooltipBox
                    rows={[
                      {
                        label: String(payload[0].name),
                        value: `${formatRupiah(Number(payload[0].value))} · ${formatPercent(Number(payload[0].value) / total, 1)}`,
                        color: (payload[0].payload as { fill: string }).fill,
                      },
                    ]}
                  />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
          <span className="text-sm font-semibold">{formatRupiahShort(total)}</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.fill }} />
              <span className="truncate">{r.name}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-medium">{formatRupiah(r.value)}</span>
              <span className="ml-2 inline-block w-11 text-right text-xs text-muted-foreground">{formatPercent(r.value / total, 0)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Bar bertumpuk pengeluaran per kategori per bulan. Bulan Rencana ditampilkan transparan. */
export function MonthlyStackedBars({
  months,
  categories,
}: {
  months: { month: string; isPlan: boolean; values: Record<string, number> }[];
  categories: { name: string; color?: string }[];
}) {
  const data = months.map((m) => ({ month: m.month, isPlan: m.isPlan, ...m.values }));
  const cats = categories.map((c) => ({ name: c.name, color: categoryTheme(c.name, c.color).color }));
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
        {cats.map((c) => (
          <li key={c.name} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: c.color }} />
            {c.name}
          </li>
        ))}
        {months.some((m) => m.isPlan) && (
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/40" />
            Bulan Rencana (transparan)
          </li>
        )}
      </ul>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
            <YAxis tickFormatter={(v) => formatRupiahShort(Number(v)).replace("Rp", "")} tick={TICK} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: "var(--secondary)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as { isPlan: boolean };
                const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0);
                return (
                  <TooltipBox
                    title={`${formatMonth(String(label))}${row.isPlan ? " · Rencana" : ""}`}
                    rows={[
                      ...[...payload].reverse().map((p) => ({ label: String(p.name), value: formatRupiah(Number(p.value)), color: String(p.color) })),
                      { label: "Total", value: formatRupiah(total) },
                    ]}
                  />
                );
              }}
            />
            {cats.map((c, i) => (
              <Bar
                key={c.name}
                dataKey={c.name}
                stackId="a"
                fill={c.color}
                stroke="var(--card)"
                strokeWidth={1}
                radius={i === cats.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              >
                {data.map((d) => (
                  <Cell key={d.month} fillOpacity={d.isPlan ? 0.35 : 1} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const yFmt = (v: unknown) => formatRupiahShort(Number(v)).replace("Rp", "");

function Legend({ items }: { items: { name: string; color: string; line?: boolean; faded?: boolean }[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
      {items.map((c) => (
        <li key={c.name} className="flex items-center gap-1.5">
          {c.line ? (
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: c.color }} />
          ) : (
            <span className="size-2 rounded-full" style={{ background: c.color, opacity: c.faded ? 0.4 : 1 }} />
          )}
          {c.name}
        </li>
      ))}
    </ul>
  );
}

/** Arus kas: pengeluaran bertumpuk per kategori + garis gaji & uang masuk (satu sumbu Rupiah). */
export function CashflowChart({
  months,
  categories,
}: {
  months: { month: string; isPlan: boolean; inflow: number; values: Record<string, number> }[];
  categories: { name: string; color?: string }[];
}) {
  const data = months.map((m) => ({ month: m.month, isPlan: m.isPlan, inflow: m.inflow, ...m.values }));
  const cats = categories.map((c) => ({ name: c.name, color: categoryTheme(c.name, c.color).color }));
  const inflowColor = "var(--primary)";
  return (
    <div>
      <Legend
        items={[
          ...cats,
          { name: "Gaji + uang masuk", color: inflowColor, line: true },
          ...(months.some((m) => m.isPlan) ? [{ name: "Bulan Rencana", color: "#94a3b8", faded: true }] : []),
        ]}
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
            <YAxis tickFormatter={yFmt} tick={TICK} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: "var(--secondary)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as { isPlan: boolean; inflow: number };
                const bars = payload.filter((p) => p.dataKey !== "inflow");
                const out = bars.reduce((s, p) => s + Number(p.value ?? 0), 0);
                return (
                  <TooltipBox
                    title={`${formatMonth(String(label))}${row.isPlan ? " · Rencana" : ""}`}
                    rows={[
                      { label: "Gaji + uang masuk", value: formatRupiah(row.inflow), color: "var(--primary)" },
                      ...[...bars].reverse().map((p) => ({ label: String(p.name), value: formatRupiah(Number(p.value)), color: String(p.color) })),
                      { label: "Total keluar", value: formatRupiah(out) },
                      { label: "Sisa", value: formatRupiah(row.inflow - out) },
                    ]}
                  />
                );
              }}
            />
            {cats.map((c, i) => (
              <Bar key={c.name} dataKey={c.name} stackId="a" fill={c.color} stroke="var(--card)" strokeWidth={1} radius={i === cats.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.month} fillOpacity={d.isPlan ? 0.35 : 1} />
                ))}
              </Bar>
            ))}
            <Line dataKey="inflow" name="Gaji + uang masuk" type="monotone" stroke={inflowColor} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Bar bertumpuk generik per seri (mis. aset per jenis). */
export function SeriesStackedBars({
  data,
  series,
  height = 256,
}: {
  data: { month: string; [k: string]: number | string }[];
  series: { key: string; name: string; color: string }[];
  height?: number;
}) {
  return (
    <div>
      <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
            <YAxis tickFormatter={yFmt} tick={TICK} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: "var(--secondary)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0);
                return (
                  <TooltipBox
                    title={formatMonth(String(label))}
                    rows={[
                      ...[...payload].reverse().filter((p) => Number(p.value)).map((p) => ({ label: String(p.name), value: formatRupiah(Number(p.value)), color: String(p.color) })),
                      { label: "Total", value: formatRupiah(total) },
                    ]}
                  />
                );
              }}
            />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} stroke="var(--card)" strokeWidth={1} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Satu seri bar (mis. total hutang per bulan). */
export function SingleBars({ data, name, color = "var(--primary)", height = 220 }: { data: { month: string; value: number }[]; name: string; color?: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="32%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tickFormatter={formatMonth} tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickFormatter={yFmt} tick={TICK} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            content={({ active, payload, label }) =>
              active && payload?.[0] ? <TooltipBox title={formatMonth(String(label))} rows={[{ label: name, value: formatRupiah(Number(payload[0].value)), color }]} /> : null
            }
          />
          <Bar dataKey="value" name={name} fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Garis multi-seri dengan satu sumbu Rupiah (mis. gaji vs pengeluaran). */
export function MultiLine({
  data,
  series,
  height = 256,
  percent,
  refLine,
}: {
  data: { month: string; [k: string]: number | string | null }[];
  series: { key: string; name: string; color: string; dashed?: boolean }[];
  height?: number;
  /** Nilai berupa rasio (0.2 = 20%) */
  percent?: boolean;
  /** Garis acuan horizontal (mis. target 20%) */
  refLine?: { value: number; label: string };
}) {
  const fmt = (v: number) => (percent ? formatPercent(v, 1) : formatRupiah(v));
  return (
    <div>
      <Legend items={[...series.map((s) => ({ name: s.name, color: s.color, line: true })), ...(refLine ? [{ name: refLine.label, color: "var(--muted-foreground)", line: true }] : [])]} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tickFormatter={percent ? (v) => `${Math.round(Number(v) * 100)}%` : yFmt} tick={TICK} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={formatMonth(String(label))}
                    rows={[
                      ...payload.map((p) => ({ label: String(p.name), value: p.value === null || p.value === undefined ? "–" : fmt(Number(p.value)), color: String(p.color) })),
                      ...(refLine ? [{ label: refLine.label, value: fmt(refLine.value) }] : []),
                    ]}
                  />
                ) : null
              }
            />
            {refLine && <ReferenceLine y={refLine.value} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.6} />}
            {series.map((s) => (
              <Line key={s.key} dataKey={s.key} name={s.name} type="monotone" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Bar persentase horizontal (tanpa sumbu ganda).
 * - mode "budget": 0..max, penanda 100% = target; > 100% merah.
 * - mode "diverging": negatif ke kiri (merah), positif ke kanan (hijau).
 */
export function PercentBars({
  rows,
  mode = "budget",
}: {
  rows: { name: string; ratio: number | null; color: string; hint?: string }[];
  mode?: "budget" | "diverging";
}) {
  if (mode === "diverging") {
    const max = Math.max(0.05, ...rows.map((r) => Math.abs(r.ratio ?? 0)));
    return (
      <ul className="space-y-3">
        {rows.map((r) => {
          const w = r.ratio === null ? 0 : (Math.abs(r.ratio) / max) * 50;
          const neg = (r.ratio ?? 0) < 0;
          return (
            <li key={r.name} className="grid grid-cols-[minmax(0,8.5rem)_1fr_4rem] items-center gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="truncate">{r.name}</span>
              </span>
              <span className="relative h-3 rounded-full bg-secondary">
                <span aria-hidden className="absolute top-[-3px] bottom-[-3px] left-1/2 w-px bg-foreground/25" />
                <span
                  className={cn("absolute top-0 bottom-0 rounded-full", neg ? "bg-negative" : "bg-positive")}
                  style={neg ? { right: "50%", width: `${w}%` } : { left: "50%", width: `${w}%` }}
                />
              </span>
              <span className={cn("text-right text-xs font-semibold tabular-nums", r.ratio === null ? "text-muted-foreground" : neg ? "text-negative" : r.ratio > 0 ? "text-positive" : "")}>
                {r.ratio === null ? "–" : `${r.ratio > 0 ? "+" : ""}${formatPercent(r.ratio, 1)}`}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  const max = Math.max(1.2, ...rows.map((r) => r.ratio ?? 0));
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => {
        const over = (r.ratio ?? 0) > 1;
        return (
          <li key={r.name} className="text-sm">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="truncate font-medium">{r.name}</span>
              </span>
              <span className={cn("shrink-0 text-xs font-semibold tabular-nums", over && "text-negative")}>{r.ratio === null ? "–" : formatPercent(r.ratio, 0)}</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${Math.min(100, ((r.ratio ?? 0) / max) * 100)}%`, background: over ? "var(--negative)" : r.color }}
              />
              <span aria-hidden className="absolute top-[-3px] bottom-[-3px] w-0.5 rounded-full bg-foreground/40" style={{ left: `${(1 / max) * 100}%` }} />
            </div>
            {r.hint && <div className="mt-1 text-[11px] text-muted-foreground">{r.hint}</div>}
          </li>
        );
      })}
    </ul>
  );
}
