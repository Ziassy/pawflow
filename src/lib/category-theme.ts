import {
  ArrowDownLeft,
  CreditCard,
  HeartHandshake,
  ShoppingBasket,
  Shapes,
  Sprout,
  type LucideIcon,
} from "lucide-react";

// Tampilan kategori (UI saja). Warna = palet kategorikal tervalidasi CVD,
// urutan tetap sesuai urutan kategori; jangan diputar ulang per grafik.
const THEME: Record<string, { color: string; icon: LucideIcon }> = {
  Kebutuhan: { color: "#2a78d6", icon: ShoppingBasket },
  Cicilan: { color: "#eb6834", icon: CreditCard },
  "Masa Depan": { color: "#1baf7a", icon: Sprout },
  Kebaikan: { color: "#eda100", icon: HeartHandshake },
  Lainnya: { color: "#e87ba4", icon: Shapes },
  Pemasukan: { color: "#008300", icon: ArrowDownLeft },
};

export function categoryTheme(name: string, fallbackColor = "#64748b") {
  return THEME[name] ?? { color: fallbackColor, icon: Shapes };
}

export const SAVINGS_CATEGORY = "Masa Depan";

/** Palet kategorikal 8 slot (tervalidasi). Urutan tetap — slot mengikuti entitas, bukan peringkat. */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const OTHER_COLOR = "#94a3b8";

/** Warna per jenis aset berdasarkan urutan tetapnya (sortOrder). Lebih dari 7 -> abu "Lainnya". */
export function seriesColor(index: number): string {
  return index < SERIES.length - 1 ? SERIES[index] : OTHER_COLOR;
}
