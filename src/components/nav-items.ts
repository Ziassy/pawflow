import {
  ArrowLeftRight,
  CalendarDays,
  HandCoins,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Table2,
  Target,
  type LucideIcon,
} from "lucide-react";

/** color = warna identitas menu (ikon & highlight). */
export type NavItem = { href: string; label: string; icon: LucideIcon; color: string; mobile?: boolean; hint?: string; short?: string };
export type NavGroup = { label: string; items: NavItem[] };

// `mobile: true` = tampil di bottom nav HP; sisanya di menu "Lainnya".
// `short` = label ringkas untuk dock HP yang sempit.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Utama",
    items: [{ href: "/", color: "#2563eb", label: "Dashboard", icon: LayoutDashboard, mobile: true, hint: "Ringkasan & grafik" }],
  },
  {
    label: "Catatan",
    items: [
      { href: "/bulanan", color: "#7c3aed", label: "Bulanan", icon: CalendarDays, mobile: true, hint: "Gaji & transaksi per bulan" },
      { href: "/transaksi", color: "#0d9488", label: "Transaksi", icon: ArrowLeftRight, mobile: true, hint: "Cari & filter semua" },
      { href: "/ringkasan", color: "#0284c7", label: "Ringkasan Bulanan", short: "Ringkasan", icon: Table2, hint: "Rekap per kategori" },
    ],
  },
  {
    label: "Kekayaan",
    items: [
      { href: "/hutang", color: "#ea580c", label: "Hutang & Piutang", short: "Hutang", icon: HandCoins, hint: "Kartu, cicilan, piutang" },
      { href: "/investasi", color: "#16a34a", label: "Investasi & Aset", short: "Investasi", icon: PiggyBank, hint: "Portofolio & Asset Tracker" },
      { href: "/target", color: "#db2777", label: "Target & FIRE", short: "Target", icon: Target, hint: "Tangga ternak uang" },
    ],
  },
  {
    label: "Sistem",
    items: [{ href: "/pengaturan", color: "#64748b", label: "Pengaturan", icon: Settings, hint: "Profil, kategori, template" }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export const SIDEBAR_COOKIE = "ck_sidebar";
