import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // CLI (migrate) memakai DIRECT_URL bila ada: koneksi langsung Neon tanpa pooler,
  // karena migrasi memakai advisory lock yang tidak cocok dengan PgBouncer.
  // App (runtime) tetap memakai DATABASE_URL (pooled), lihat src/lib/db.ts.
  datasource: {
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
  },
});
