// Kembali ke SQLite lokal (kebalikan db:use-postgres).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";

const SCHEMA = "prisma/schema.prisma";
const s = readFileSync(SCHEMA, "utf8");
const DS = /(datasource db \{[^}]*?provider\s*=\s*)"(\w+)"/;
const current = DS.exec(s)?.[2];
if (current === "sqlite") {
  console.log("Skema sudah SQLite. Tidak ada yang diubah.");
  process.exit(0);
}
if (current !== "postgresql") throw new Error(`Provider tidak dikenali: ${current}`);
writeFileSync(SCHEMA, s.replace(DS, '$1"sqlite"'));
if (existsSync("prisma/migrations-sqlite")) {
  rmSync("prisma/migrations", { recursive: true, force: true });
  renameSync("prisma/migrations-sqlite", "prisma/migrations");
}
execFileSync("npx", ["prisma", "generate"], { stdio: "inherit" });
console.log('✓ Kembali ke SQLite. Pastikan DATABASE_URL="file:./dev.db".');
