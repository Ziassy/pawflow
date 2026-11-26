-- Hutang ke orang: dua jenis seperti piutang (BEBAS / CICILAN) + tautan transaksi untuk pembayaran hutang bebas.
-- Hanya menambah kolom/indeks; hutang lama otomatis "BEBAS". Satu transaksi: gagal = tidak ada yang berubah.
BEGIN;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "debtEntryId" INTEGER;

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "dueDay" INTEGER,
ADD COLUMN     "installmentAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "installmentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "principal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "repayment" TEXT NOT NULL DEFAULT 'BEBAS',
ADD COLUMN     "startMonth" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_debtEntryId_key" ON "Transaction"("debtEntryId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debtEntryId_fkey" FOREIGN KEY ("debtEntryId") REFERENCES "DebtEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
