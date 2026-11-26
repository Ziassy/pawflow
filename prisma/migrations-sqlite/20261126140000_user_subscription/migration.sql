-- Masa langganan per akun. Kolom baru boleh kosong (= tanpa batas), jadi akun lama tetap aktif.
-- AlterTable
ALTER TABLE "User" ADD COLUMN "subscriptionUntil" DATETIME;
