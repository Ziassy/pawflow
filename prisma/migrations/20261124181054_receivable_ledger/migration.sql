-- CreateTable
CREATE TABLE "ReceivableEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "receivableId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "ReceivableEntry_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Receivable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CICILAN',
    "principal" INTEGER NOT NULL DEFAULT 0,
    "installmentCount" INTEGER NOT NULL DEFAULT 0,
    "installmentAmount" INTEGER NOT NULL DEFAULT 0,
    "dueDay" INTEGER,
    "startMonth" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Receivable" ("createdAt", "dueDay", "id", "installmentAmount", "installmentCount", "name", "note", "principal", "startMonth") SELECT "createdAt", "dueDay", "id", "installmentAmount", "installmentCount", "name", "note", "principal", "startMonth" FROM "Receivable";
DROP TABLE "Receivable";
ALTER TABLE "new_Receivable" RENAME TO "Receivable";
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
    "receivableEntryId" INTEGER,
    "goalId" INTEGER,
    "investmentId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "MonthlyPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_debtPlanId_fkey" FOREIGN KEY ("debtPlanId") REFERENCES "DebtPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_receivableInstallmentId_fkey" FOREIGN KEY ("receivableInstallmentId") REFERENCES "ReceivableInstallment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_receivableEntryId_fkey" FOREIGN KEY ("receivableEntryId") REFERENCES "ReceivableEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "categoryId", "createdAt", "debtPlanId", "goalId", "id", "importKey", "investmentId", "isPaid", "name", "note", "periodId", "receivableInstallmentId", "sortOrder", "source", "updatedAt") SELECT "amount", "categoryId", "createdAt", "debtPlanId", "goalId", "id", "importKey", "investmentId", "isPaid", "name", "note", "periodId", "receivableInstallmentId", "sortOrder", "source", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_importKey_key" ON "Transaction"("importKey");
CREATE UNIQUE INDEX "Transaction_debtPlanId_key" ON "Transaction"("debtPlanId");
CREATE UNIQUE INDEX "Transaction_receivableInstallmentId_key" ON "Transaction"("receivableInstallmentId");
CREATE UNIQUE INDEX "Transaction_receivableEntryId_key" ON "Transaction"("receivableEntryId");
CREATE INDEX "Transaction_periodId_idx" ON "Transaction"("periodId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_goalId_idx" ON "Transaction"("goalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ReceivableEntry_receivableId_idx" ON "ReceivableEntry"("receivableId");
