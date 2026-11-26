// Masa langganan akun (murni, tanpa DB).
// subscriptionUntil = tanggal kalender (UTC tengah malam, seperti kolom tanggal lain).
// Aktif sampai akhir tanggal itu menurut APP_TIME_ZONE; null = tanpa batas. Admin tidak pernah terkunci.
import { addMonths, todayKey } from "./format";

/** Date (UTC tengah malam) -> "2026-12-31". */
export const dateKey = (d: Date) => d.toISOString().slice(0, 10);

/** Sudah lewat tanggal berakhir? (hari terakhir masih aktif) */
export function isSubscriptionExpired(until: Date | null, now = new Date()): boolean {
  return until !== null && todayKey(now) > dateKey(until);
}

/** Akun hanya bisa melihat data. */
export function isReadOnly(user: { isAdmin: boolean; subscriptionUntil: Date | null }, now = new Date()): boolean {
  return !user.isAdmin && isSubscriptionExpired(user.subscriptionUntil, now);
}

/** Sisa hari aktif termasuk hari ini (0 = sudah berakhir). null = tanpa batas. */
export function daysLeft(until: Date | null, now = new Date()): number | null {
  if (until === null) return null;
  const diff = (Date.parse(`${dateKey(until)}T00:00:00Z`) - Date.parse(`${todayKey(now)}T00:00:00Z`)) / 86_400_000;
  return Math.max(0, Math.round(diff) + 1);
}

/**
 * Perpanjang n bulan dari tanggal berakhir, atau dari hari ini bila sudah lewat / belum ada.
 * Tanggal disesuaikan ke akhir bulan bila perlu (31 Jan + 1 bln = 28/29 Feb).
 */
export function extendSubscription(until: Date | null, months: number, now = new Date()): string {
  const today = todayKey(now);
  const base = until && dateKey(until) >= today ? dateKey(until) : today;
  const [y, m, d] = base.split("-").map(Number);
  const target = addMonths(`${y}-${String(m).padStart(2, "0")}`, months);
  const [ty, tm] = target.split("-").map(Number);
  const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return `${target}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}
