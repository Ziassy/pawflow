import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diset");
  // file:... -> SQLite lokal; postgres://... -> PostgreSQL (Neon/Supabase).
  // Catatan: provider di prisma/schema.prisma harus sesuai (lihat README).
  if (url.startsWith("file:")) {
    // Dimuat hanya saat SQLite dipakai, agar modul native tidak ikut dimuat di server PostgreSQL.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
    return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Jenis database aktif (untuk backup/restore). */
export const dbProvider = (process.env.DATABASE_URL ?? "").startsWith("file:") ? "sqlite" : "postgresql";
