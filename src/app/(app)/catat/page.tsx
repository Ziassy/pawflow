import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { toMonthKey } from "@/lib/format";

// Tombol "Catat transaksi": langsung ke bulan berjalan; jika belum ada, ke form buat bulan.
export default async function CatatPage() {
  const month = toMonthKey(new Date());
  const exists = await db.monthlyPeriod.findUnique({ where: { month }, select: { id: true } });
  redirect(exists ? `/bulanan/${month}` : "/bulanan");
}
