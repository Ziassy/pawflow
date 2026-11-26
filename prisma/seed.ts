// Seed idempotent: aman dijalankan berulang.
// - Belum ada akun: buat akun "admin" (login pertama memakai APP_PASSWORD).
// - Isi data awal (kategori, template, jenis aset, platform) untuk akun admin.
import "dotenv/config";
import { baseDb } from "../src/lib/db-base";
import { runAsUser } from "../src/lib/db";
import { seedUserDefaults } from "../src/lib/user-defaults";

async function main() {
  let admin = await baseDb.user.findFirst({ where: { isAdmin: true }, orderBy: { id: "asc" } });
  if (!admin) {
    admin = await baseDb.user.create({ data: { username: "admin", name: "Admin", isAdmin: true } });
    console.log('Akun "admin" dibuat. Login pertama memakai APP_PASSWORD, lalu ganti password di Pengaturan.');
  }
  const r = await runAsUser(admin.id, seedUserDefaults);
  console.log(
    `Seed selesai untuk akun "${admin.username}": ${r.categories} kategori, ${r.templates} template, ` +
      `${r.assetTypes} jenis aset, ${r.platforms} platform.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => baseDb.$disconnect());
