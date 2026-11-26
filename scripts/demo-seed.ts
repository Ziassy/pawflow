// Data demo 12 bulan untuk melihat tampilan. Pakai DB terpisah, jangan ke DB asli:
//   DATABASE_URL="file:./demo.db" npx prisma migrate deploy && DATABASE_URL="file:./demo.db" npm run db:seed
//   DATABASE_URL="file:./demo.db" npx tsx scripts/demo-seed.ts && DATABASE_URL="file:./demo.db" npm run dev
import "dotenv/config";
import { db } from "../src/lib/db";
import { runAsCliUser } from "./as-user";
const rnd = (a: number, b: number) => Math.round((a + Math.random() * (b - a)) / 1000) * 1000;
async function main() {
  const c = Object.fromEntries((await db.category.findMany()).map((x) => [x.name, x.id]));
  const months = ["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10","2026-11","2026-12"];
  for (const [i, m] of months.entries()) {
    const plan = m >= "2026-12";
    const items: [string, string, number | null, boolean][] = [
      ["Kuota", "Kebutuhan", 150000, true], ["Uang jajan", "Kebutuhan", rnd(2500000, 3500000), true],
      ["BPJS Kesehatan", "Kebutuhan", 150000, true], ["Kucing", "Kebutuhan", rnd(300000, 600000), true],
      ["Kontrol Behel", "Kebutuhan", 350000, true],
      ["BCA Kredit", "Cicilan", rnd(2500000, 3500000), true], ["Tokopedia Card", "Cicilan", rnd(800000, 1500000), true],
      ["Spaylater", "Cicilan", rnd(300000, 700000), m !== "2026-11"],
      ["Investasi", "Masa Depan", 1500000, true], ["Dana Darurat", "Masa Depan", 1000000, true], ["BPJSTK", "Masa Depan", 200000, true],
      ["Mom", "Kebaikan", 1500000, true], ["Sedekah", "Kebaikan", 200000, true],
      ["Lain-lain", "Lainnya", rnd(100000, 800000), true],
    ];
    if (i % 3 === 0) items.push(["Freelance desain", "Pemasukan", rnd(500000, 2000000), true]);
    if (m === "2026-11") items.push(["Servis motor", "Lainnya", null, false]);
    await db.monthlyPeriod.create({ data: { month: m, salary: i < 4 ? 13000000 : 14200000, isPlan: plan,
      transactions: { create: items.map(([name, cat, amount, paid], k) => ({ name, categoryId: c[cat], amount, isPaid: plan ? false : paid, sortOrder: k })) } } });
  }
}
runAsCliUser(process.argv.slice(2), main).finally(() => db.$disconnect());
