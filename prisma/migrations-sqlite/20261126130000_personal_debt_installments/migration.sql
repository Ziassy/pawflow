-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Debt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "repayment" TEXT NOT NULL DEFAULT 'BEBAS',
    "principal" INTEGER NOT NULL DEFAULT 0,
    "installmentCount" INTEGER NOT NULL DEFAULT 0,
    "installmentAmount" INTEGER NOT NULL DEFAULT 0,
    "dueDay" INTEGER,
    "startMonth" TEXT,
    CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Debt" ("active", "id", "kind", "name", "note", "sortOrder", "userId") SELECT "active", "id", "kind", "name", "note", "sortOrder", "userId" FROM "Debt";
DROP TABLE "Debt";
ALTER TABLE "new_Debt" RENAME TO "Debt";
CREATE UNIQUE INDEX "Debt_userId_name_key" ON "Debt"("userId", "name");
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
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
    "debtEntryId" INTEGER,
    "goalId" INTEGER,
    "investmentId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "MonthlyPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_debtPlanId_fkey" FOREIGN KEY ("debtPlanId") REFERENCES "DebtPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_receivableInstallmentId_fkey" FOREIGN KEY ("receivableInstallmentId") REFERENCES "ReceivableInstallment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_debtEntryId_fkey" FOREIGN KEY ("debtEntryId") REFERENCES "DebtEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_receivableEntryId_fkey" FOREIGN KEY ("receivableEntryId") REFERENCES "ReceivableEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "categoryId", "createdAt", "debtPlanId", "goalId", "id", "importKey", "investmentId", "isPaid", "name", "note", "periodId", "receivableEntryId", "receivableInstallmentId", "sortOrder", "source", "updatedAt", "userId") SELECT "amount", "categoryId", "createdAt", "debtPlanId", "goalId", "id", "importKey", "investmentId", "isPaid", "name", "note", "periodId", "receivableEntryId", "receivableInstallmentId", "sortOrder", "source", "updatedAt", "userId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_debtPlanId_key" ON "Transaction"("debtPlanId");
CREATE UNIQUE INDEX "Transaction_receivableInstallmentId_key" ON "Transaction"("receivableInstallmentId");
CREATE UNIQUE INDEX "Transaction_receivableEntryId_key" ON "Transaction"("receivableEntryId");
CREATE UNIQUE INDEX "Transaction_debtEntryId_key" ON "Transaction"("debtEntryId");
CREATE INDEX "Transaction_periodId_idx" ON "Transaction"("periodId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_goalId_idx" ON "Transaction"("goalId");
CREATE UNIQUE INDEX "Transaction_userId_importKey_key" ON "Transaction"("userId", "importKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

