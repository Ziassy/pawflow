// Pilih akun untuk skrip CLI: `--user <username>` (default: admin pertama).
import { baseDb } from "../src/lib/db-base";
import { runAsUser } from "../src/lib/db";

export async function runAsCliUser<T>(argv: string[], fn: () => Promise<T>): Promise<T> {
  const i = argv.indexOf("--user");
  const username = i >= 0 ? argv[i + 1]?.trim().toLowerCase() : undefined;
  const user = username
    ? await baseDb.user.findUnique({ where: { username } })
    : await baseDb.user.findFirst({ where: { isAdmin: true }, orderBy: { id: "asc" } });
  if (!user) throw new Error(username ? `Akun "${username}" tidak ada` : "Belum ada akun admin. Jalankan `npm run db:seed` dulu.");
  console.log(`Akun: ${user.username}\n`);
  return runAsUser(user.id, fn);
}
