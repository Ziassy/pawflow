-- Multi akun (PostgreSQL). Semua data lama menjadi milik akun "admin" (id 1).
-- Tidak ada tabel yang dihapus; baris data lama tetap ada. Satu transaksi: gagal = tidak ada yang berubah.
BEGIN;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Akun pertama. passwordHash kosong: login pertama memakai APP_PASSWORD lalu disimpan sebagai hash.
INSERT INTO "User" ("id", "username", "name", "isAdmin") VALUES (1, 'admin', 'Admin', true);
-- id diisi manual: majukan sequence agar akun berikutnya mulai dari 2
SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX("id") FROM "User"));

-- AppSetting: satu baris per akun (dulu satu baris global id = 1)
ALTER TABLE "AppSetting" ADD COLUMN "userId" INTEGER;
UPDATE "AppSetting" SET "userId" = 1 WHERE "id" = (SELECT MIN("id") FROM "AppSetting");
DELETE FROM "AppSetting" WHERE "userId" IS NULL; -- baris ganda tak terpakai (aplikasi selalu memakai satu baris)
ALTER TABLE "AppSetting" DROP CONSTRAINT "AppSetting_pkey",
DROP COLUMN "id",
ALTER COLUMN "userId" SET NOT NULL,
ADD CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("userId");

-- Kolom userId: baris lama langsung terisi 1 (admin), lalu default diubah ke 0.
-- Default 0 hanya untuk tipe Prisma; tidak ada akun id 0, jadi foreign key menolak baris tanpa pemilik.
ALTER TABLE "Category" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Category" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "MonthlyPeriod" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "MonthlyPeriod" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "Transaction" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Transaction" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "RecurringTemplate" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RecurringTemplate" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "Debt" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Debt" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "DebtSnapshot" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DebtSnapshot" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "DebtPlan" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DebtPlan" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "DebtEntry" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DebtEntry" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "Receivable" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Receivable" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "ReceivableEntry" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ReceivableEntry" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "ReceivableInstallment" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ReceivableInstallment" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "Platform" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Platform" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "AssetType" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AssetType" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "Investment" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Investment" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "AssetSnapshot" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AssetSnapshot" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "PortfolioTarget" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PortfolioTarget" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "PhysicalAsset" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PhysicalAsset" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "Goal" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Goal" ALTER COLUMN "userId" SET DEFAULT 0;
ALTER TABLE "Resolution" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Resolution" ALTER COLUMN "userId" SET DEFAULT 0;

-- AssetMonthNote: kunci month global -> id + unik per akun
ALTER TABLE "AssetMonthNote" DROP CONSTRAINT "AssetMonthNote_pkey",
ADD COLUMN "id" SERIAL NOT NULL,
ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1,
ADD CONSTRAINT "AssetMonthNote_pkey" PRIMARY KEY ("id");
ALTER TABLE "AssetMonthNote" ALTER COLUMN "userId" SET DEFAULT 0;

-- Unik global -> unik per akun

-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "MonthlyPeriod_month_key";

-- DropIndex
DROP INDEX "Transaction_importKey_key";

-- DropIndex
DROP INDEX "Debt_name_key";

-- DropIndex
DROP INDEX "Platform_name_key";

-- DropIndex
DROP INDEX "AssetType_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPeriod_userId_month_key" ON "MonthlyPeriod"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_importKey_key" ON "Transaction"("userId", "importKey");

-- CreateIndex
CREATE INDEX "RecurringTemplate_userId_idx" ON "RecurringTemplate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Debt_userId_name_key" ON "Debt"("userId", "name");

-- CreateIndex
CREATE INDEX "DebtSnapshot_userId_idx" ON "DebtSnapshot"("userId");

-- CreateIndex
CREATE INDEX "DebtPlan_userId_idx" ON "DebtPlan"("userId");

-- CreateIndex
CREATE INDEX "DebtEntry_userId_idx" ON "DebtEntry"("userId");

-- CreateIndex
CREATE INDEX "Receivable_userId_idx" ON "Receivable"("userId");

-- CreateIndex
CREATE INDEX "ReceivableEntry_userId_idx" ON "ReceivableEntry"("userId");

-- CreateIndex
CREATE INDEX "ReceivableInstallment_userId_idx" ON "ReceivableInstallment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_userId_name_key" ON "Platform"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AssetType_userId_name_key" ON "AssetType"("userId", "name");

-- CreateIndex
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");

-- CreateIndex
CREATE INDEX "AssetSnapshot_userId_idx" ON "AssetSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetMonthNote_userId_month_key" ON "AssetMonthNote"("userId", "month");

-- CreateIndex
CREATE INDEX "PortfolioTarget_userId_idx" ON "PortfolioTarget"("userId");

-- CreateIndex
CREATE INDEX "PhysicalAsset_userId_idx" ON "PhysicalAsset"("userId");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Resolution_userId_idx" ON "Resolution"("userId");

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPeriod" ADD CONSTRAINT "MonthlyPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtSnapshot" ADD CONSTRAINT "DebtSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPlan" ADD CONSTRAINT "DebtPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEntry" ADD CONSTRAINT "DebtEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableEntry" ADD CONSTRAINT "ReceivableEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableInstallment" ADD CONSTRAINT "ReceivableInstallment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Platform" ADD CONSTRAINT "Platform_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetType" ADD CONSTRAINT "AssetType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSnapshot" ADD CONSTRAINT "AssetSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMonthNote" ADD CONSTRAINT "AssetMonthNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioTarget" ADD CONSTRAINT "PortfolioTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalAsset" ADD CONSTRAINT "PhysicalAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
