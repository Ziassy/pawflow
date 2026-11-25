/*
  Warnings:

  - You are about to drop the column `status` on the `Transaction` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "periodId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "amount" INTEGER,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "importKey" TEXT,
    "debtPlanId" INTEGER,
    "receivableInstallmentId" INTEGER,
    "goalId" INTEGER,
    "investmentId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "MonthlyPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_debtPlanId_fkey" FOREIGN KEY ("debtPlanId") REFERENCES "DebtPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_receivableInstallmentId_fkey" FOREIGN KEY ("receivableInstallmentId") REFERENCES "ReceivableInstallment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "categoryId", "createdAt", "debtPlanId", "goalId", "id", "importKey", "investmentId", "isPaid", "name", "note", "periodId", "receivableInstallmentId", "sortOrder", "source", "updatedAt") SELECT "amount", "categoryId", "createdAt", "debtPlanId", "goalId", "id", "importKey", "investmentId", "isPaid", "name", "note", "periodId", "receivableInstallmentId", "sortOrder", "source", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_importKey_key" ON "Transaction"("importKey");
CREATE UNIQUE INDEX "Transaction_debtPlanId_key" ON "Transaction"("debtPlanId");
CREATE UNIQUE INDEX "Transaction_receivableInstallmentId_key" ON "Transaction"("receivableInstallmentId");
CREATE INDEX "Transaction_periodId_idx" ON "Transaction"("periodId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
