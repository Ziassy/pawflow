// Pindahkan proyek ke PostgreSQL (Neon / Supabase).
//   npm run db:use-postgres
// 1. provider di prisma/schema.prisma -> "postgresql"
// 2. migrasi SQLite dipindah ke prisma/migrations-sqlite (arsip)
// 3. migrasi awal PostgreSQL dibuat dari skema (tanpa perlu koneksi DB)
// Kembali ke SQLite: npm run db:use-sqlite
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const SCHEMA = "prisma/schema.prisma";
const s = readFileSync(SCHEMA, "utf8");
const DS = /(datasource db \{[^}]*?provider\s*=\s*)"(\w+)"/;
const current = DS.exec(s)?.[2];
if (current === "postgresql") {
  console.log("Skema sudah PostgreSQL. Tidak ada yang diubah.");
  process.exit(0);
}
if (current !== "sqlite") throw new Error(`Provider tidak dikenali: ${current}`);
writeFileSync(SCHEMA, s.replace(DS, '$1"postgresql"'));
console.log("✓ provider -> postgresql");

if (existsSync("prisma/migrations") && !existsSync("prisma/migrations-sqlite")) {
  renameSync("prisma/migrations", "prisma/migrations-sqlite");
  console.log("✓ migrasi SQLite diarsipkan ke prisma/migrations-sqlite");
}
mkdirSync("prisma/migrations/0_init", { recursive: true });
const sql = execFileSync("npx", ["prisma", "migrate", "diff", "--from-empty", "--to-schema", SCHEMA, "--script"], { encoding: "utf8" });
writeFileSync("prisma/migrations/0_init/migration.sql", sql.replace(/^.*Loaded Prisma config.*\n/m, ""));
writeFileSync("prisma/migrations/migration_lock.toml", 'provider = "postgresql"\n');
console.log("✓ prisma/migrations/0_init/migration.sql dibuat");
execFileSync("npx", ["prisma", "generate"], { stdio: "inherit" });
console.log(`
Langkah berikutnya:
  1. Set DATABASE_URL ke connection string Neon (postgresql://...?sslmode=require)
  2. npm run db:deploy && npm run db:seed
  3. Pindahkan data: Pengaturan > Unduh backup (dari app lokal SQLite), lalu Pulihkan di app PostgreSQL.`);
