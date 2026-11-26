/**
 * Palet warna utama aplikasi. Setiap tema mendefinisikan hue OKLCH yang dipakai
 * untuk menghasilkan seluruh variabel --primary, --brand, --hero-*, dll.
 * Disimpan di cookie "color-theme" (tanpa DB, agar tidak butuh migrasi).
 */

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];

export const COLOR_THEMES = [
  { id: "blue",   label: "Biru",   hue: 258, chroma: 0.20, hex: "#3b6fd6" },
  { id: "violet", label: "Ungu",   hue: 290, chroma: 0.18, hex: "#8b5cf6" },
  { id: "teal",   label: "Hijau",  hue: 180, chroma: 0.14, hex: "#0d9488" },
  { id: "rose",   label: "Merah",  hue: 15,  chroma: 0.20, hex: "#e35d6a" },
  { id: "amber",  label: "Kuning", hue: 75,  chroma: 0.16, hex: "#c4930a" },
  { id: "slate",  label: "Abu",    hue: 260, chroma: 0.03, hex: "#64748b" },
] as const;

export const DEFAULT_THEME: ColorThemeId = "blue";
export const COLOR_THEME_COOKIE = "color-theme";

export function getColorTheme(id: string | undefined): (typeof COLOR_THEMES)[number] {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

/** Pasangan key-value untuk light mode. */
function lightPairs(h: number, c: number): [string, string][] {
  return [
    ["--background", `oklch(0.982 0.008 ${h})`],
    ["--foreground", `oklch(0.22 0.03 ${h + 2})`],
    ["--card-foreground", `oklch(0.22 0.03 ${h + 2})`],
    ["--primary", `oklch(0.58 ${c} ${h})`],
    ["--primary-foreground", `oklch(0.99 0.005 ${h})`],
    ["--secondary", `oklch(0.96 0.014 ${h})`],
    ["--secondary-foreground", `oklch(0.3 0.06 ${h + 2})`],
    ["--muted", `oklch(0.96 0.014 ${h})`],
    ["--muted-foreground", `oklch(0.52 0.03 ${h})`],
    ["--accent", `oklch(0.94 0.04 ${h})`],
    ["--accent-foreground", `oklch(0.45 0.18 ${h})`],
    ["--border", `oklch(0.92 0.015 ${h})`],
    ["--input", `oklch(0.89 0.02 ${h})`],
    ["--ring", `oklch(0.62 0.18 ${h - 3})`],
    ["--brand", `oklch(0.58 ${c} ${h})`],
    ["--hero-from", `oklch(0.55 ${Math.min(c + 0.01, 0.24)} ${h + 4})`],
    ["--hero-to", `oklch(0.7 ${Math.max(c - 0.05, 0.1)} ${h - 28})`],
    ["--sidebar", `oklch(1 0 0)`],
    ["--sidebar-foreground", `oklch(0.22 0.03 ${h + 2})`],
    ["--sidebar-primary", `oklch(0.58 ${c} ${h})`],
    ["--sidebar-primary-foreground", `oklch(0.99 0 0)`],
    ["--sidebar-accent", `oklch(0.96 0.014 ${h})`],
    ["--sidebar-accent-foreground", `oklch(0.3 0.06 ${h + 2})`],
    ["--sidebar-border", `oklch(0.92 0.015 ${h})`],
    ["--sidebar-ring", `oklch(0.62 0.18 ${h - 3})`],
    ["--card-shadow", `0 1px 2px oklch(0.4 0.1 ${h} / 0.05), 0 6px 20px -6px oklch(0.45 0.15 ${h} / 0.12)`],
  ];
}

/** Pasangan key-value untuk dark mode (branded, bukan achromatic). */
function darkPairs(h: number, c: number): [string, string][] {
  const cd = Math.min(c, 0.18);
  return [
    ["--background", `oklch(0.16 0.015 ${h})`],
    ["--foreground", `oklch(0.93 0.01 ${h})`],
    ["--card", `oklch(0.2 0.018 ${h})`],
    ["--card-foreground", `oklch(0.93 0.01 ${h})`],
    ["--popover", `oklch(0.2 0.018 ${h})`],
    ["--popover-foreground", `oklch(0.93 0.01 ${h})`],
    ["--primary", `oklch(0.7 ${cd} ${h})`],
    ["--primary-foreground", `oklch(0.16 0.02 ${h})`],
    ["--secondary", `oklch(0.24 0.02 ${h})`],
    ["--secondary-foreground", `oklch(0.9 0.01 ${h})`],
    ["--muted", `oklch(0.24 0.02 ${h})`],
    ["--muted-foreground", `oklch(0.65 0.03 ${h})`],
    ["--accent", `oklch(0.26 0.03 ${h})`],
    ["--accent-foreground", `oklch(0.85 0.08 ${h})`],
    ["--destructive", `oklch(0.65 0.2 25)`],
    ["--border", `oklch(0.3 0.02 ${h})`],
    ["--input", `oklch(0.28 0.02 ${h})`],
    ["--ring", `oklch(0.6 0.15 ${h})`],
    ["--brand", `oklch(0.7 ${cd} ${h})`],
    ["--brand-foreground", `oklch(0.16 0.02 ${h})`],
    ["--hero-from", `oklch(0.42 ${Math.min(c + 0.01, 0.22)} ${h + 4})`],
    ["--hero-to", `oklch(0.52 ${Math.max(c - 0.04, 0.1)} ${h - 28})`],
    ["--positive", `oklch(0.65 0.14 160)`],
    ["--positive-soft", `oklch(0.25 0.06 160)`],
    ["--negative", `oklch(0.65 0.18 22)`],
    ["--negative-soft", `oklch(0.25 0.06 22)`],
    ["--warning", `oklch(0.7 0.14 65)`],
    ["--warning-soft", `oklch(0.28 0.06 65)`],
    ["--sidebar", `oklch(0.18 0.015 ${h})`],
    ["--sidebar-foreground", `oklch(0.93 0.01 ${h})`],
    ["--sidebar-primary", `oklch(0.7 ${cd} ${h})`],
    ["--sidebar-primary-foreground", `oklch(0.93 0 0)`],
    ["--sidebar-accent", `oklch(0.24 0.02 ${h})`],
    ["--sidebar-accent-foreground", `oklch(0.9 0.01 ${h})`],
    ["--sidebar-border", `oklch(0.3 0.02 ${h})`],
    ["--sidebar-ring", `oklch(0.6 0.15 ${h})`],
    ["--card-shadow", `0 1px 3px oklch(0 0 0 / 0.3), 0 4px 16px -4px oklch(0 0 0 / 0.4)`],
    ["--chart-1", `oklch(0.7 ${cd} ${h})`],
    ["--chart-2", `oklch(0.65 0.14 ${(h + 120) % 360})`],
    ["--chart-3", `oklch(0.6 0.12 ${(h + 240) % 360})`],
    ["--chart-4", `oklch(0.55 0.1 ${(h + 60) % 360})`],
    ["--chart-5", `oklch(0.5 0.08 ${(h + 180) % 360})`],
  ];
}

/**
 * CSS vars light mode sebagai React CSSProperties untuk atribut `style` di <html>.
 * Ditempatkan sebagai atribut, bukan <style> terpisah, agar tidak terpengaruh
 * oleh ekstensi browser yang menyisipkan elemen ke <head>.
 * `suppressHydrationWarning` di <html> mencegah warning React untuk atribut ini.
 */
export function colorThemeStyleObj(id: string | undefined): React.CSSProperties {
  const t = getColorTheme(id);
  const obj: Record<string, string> = {};
  for (const [k, v] of lightPairs(t.hue, t.chroma)) {
    obj[k] = v;
  }
  return obj as React.CSSProperties;
}

/**
 * Blocking script untuk dark mode reactivity.
 * Saat next-themes menambahkan class "dark" ke <html>, script ini menulis
 * ulang CSS vars ke versi dark. Ditempatkan di awal <body> (bukan <head>).
 */
export function colorThemeDarkScript(id: string | undefined): string {
  const t = getColorTheme(id);
  const dp = darkPairs(t.hue, t.chroma);
  const lp = lightPairs(t.hue, t.chroma);
  const darkJson = JSON.stringify(dp);
  const lightJson = JSON.stringify(lp);

  // Script: observe class changes on <html>, swap CSS vars between light/dark.
  // Runs once at load, then on every class change.
  // Dark punya key yang tidak ada di light (--card, --popover, --positive, ...).
  // Hapus dulu semua key dark sebelum menerapkan palet, agar nilai dark tidak
  // tertinggal di inline style saat kembali ke light (fallback ke globals.css).
  return `(function(){var r=document.documentElement,s=r.style;var l=${lightJson};var d=${darkJson};function a(p){for(var j=0;j<d.length;j++)s.removeProperty(d[j][0]);for(var i=0;i<p.length;i++)s.setProperty(p[i][0],p[i][1])}if(r.classList.contains("dark"))a(d);new MutationObserver(function(){a(r.classList.contains("dark")?d:l)}).observe(r,{attributes:true,attributeFilter:["class"]})})();`;
}
