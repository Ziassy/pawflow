-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Akun pertama (admin). Semua data lama menjadi miliknya.
-- passwordHash kosong: login pertama memakai APP_PASSWORD lalu password disimpan sebagai hash.
INSERT INTO "User" ("id", "username", "name", "isAdmin") VALUES (1, 'admin', 'Admin', 1);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSetting" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "birthDate" DATETIME,
    "depositRateBps" INTEGER NOT NULL DEFAULT 750,
    "interestTaxBps" INTEGER NOT NULL DEFAULT 2000,
    "assetDropAlertBps" INTEGER NOT NULL DEFAULT 3000,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AppSetting" ("userId", "assetDropAlertBps", "birthDate", "depositRateBps", "interestTaxBps", "updatedAt") SELECT 1, "assetDropAlertBps", "birthDate", "depositRateBps", "interestTaxBps", "updatedAt" FROM "AppSetting";
DROP TABLE "AppSetting";
ALTER TABLE "new_AppSetting" RENAME TO "AppSetting";
CREATE TABLE "new_AssetMonthNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "month" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    CONSTRAINT "AssetMonthNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AssetMonthNote" ("userId", "month", "note") SELECT 1, "month", "note" FROM "AssetMonthNote";
DROP TABLE "AssetMonthNote";
ALTER TABLE "new_AssetMonthNote" RENAME TO "AssetMonthNote";
CREATE UNIQUE INDEX "AssetMonthNote_userId_month_key" ON "AssetMonthNote"("userId", "month");
CREATE TABLE "new_AssetSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "month" TEXT NOT NULL,
    "assetTypeId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    CONSTRAINT "AssetSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetSnapshot_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AssetSnapshot" ("userId", "assetTypeId", "id", "month", "value") SELECT 1, "assetTypeId", "id", "month", "value" FROM "AssetSnapshot";
DROP TABLE "AssetSnapshot";
ALTER TABLE "new_AssetSnapshot" RENAME TO "AssetSnapshot";
CREATE INDEX "AssetSnapshot_userId_idx" ON "AssetSnapshot"("userId");
CREATE UNIQUE INDEX "AssetSnapshot_month_assetTypeId_key" ON "AssetSnapshot"("month", "assetTypeId");
CREATE TABLE "new_AssetType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AssetType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AssetType" ("userId", "color", "id", "name", "sortOrder") SELECT 1, "color", "id", "name", "sortOrder" FROM "AssetType";
DROP TABLE "AssetType";
ALTER TABLE "new_AssetType" RENAME TO "AssetType";
CREATE UNIQUE INDEX "AssetType_userId_name_key" ON "AssetType"("userId", "name");
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'EXPENSE',
    "targetBps" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("userId", "color", "id", "kind", "name", "sortOrder", "targetBps") SELECT 1, "color", "id", "kind", "name", "sortOrder", "targetBps" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");
CREATE TABLE "new_Debt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Debt" ("userId", "active", "id", "kind", "name", "note", "sortOrder") SELECT 1, "active", "id", "kind", "name", "note", "sortOrder" FROM "Debt";
DROP TABLE "Debt";
ALTER TABLE "new_Debt" RENAME TO "Debt";
CREATE UNIQUE INDEX "Debt_userId_name_key" ON "Debt"("userId", "name");
CREATE TABLE "new_DebtEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "debtId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "DebtEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DebtEntry_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DebtEntry" ("userId", "amount", "date", "debtId", "description", "id") SELECT 1, "amount", "date", "debtId", "description", "id" FROM "DebtEntry";
DROP TABLE "DebtEntry";
ALTER TABLE "new_DebtEntry" RENAME TO "DebtEntry";
CREATE INDEX "DebtEntry_userId_idx" ON "DebtEntry"("userId");
CREATE TABLE "new_DebtPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "debtId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DebtPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DebtPlan_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DebtPlan" ("userId", "amount", "debtId", "id", "month", "paid") SELECT 1, "amount", "debtId", "id", "month", "paid" FROM "DebtPlan";
DROP TABLE "DebtPlan";
ALTER TABLE "new_DebtPlan" RENAME TO "DebtPlan";
CREATE INDEX "DebtPlan_userId_idx" ON "DebtPlan"("userId");
CREATE UNIQUE INDEX "DebtPlan_debtId_month_key" ON "DebtPlan"("debtId", "month");
CREATE TABLE "new_DebtSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "debtId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "balance" INTEGER NOT NULL,
    CONSTRAINT "DebtSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DebtSnapshot_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DebtSnapshot" ("userId", "balance", "debtId", "id", "month") SELECT 1, "balance", "debtId", "id", "month" FROM "DebtSnapshot";
DROP TABLE "DebtSnapshot";
ALTER TABLE "new_DebtSnapshot" RENAME TO "DebtSnapshot";
CREATE INDEX "DebtSnapshot_userId_idx" ON "DebtSnapshot"("userId");
CREATE UNIQUE INDEX "DebtSnapshot_debtId_month_key" ON "DebtSnapshot"("debtId", "month");
CREATE TABLE "new_Goal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "targetAmount" BIGINT NOT NULL,
    "startMonth" TEXT,
    "deadline" TEXT,
    "collectedMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "manualCollected" BIGINT NOT NULL DEFAULT 0,
    "assetTypeId" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "targetAge" INTEGER,
    "note" TEXT,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("userId", "assetTypeId", "collectedMode", "deadline", "id", "manualCollected", "name", "note", "priority", "startMonth", "targetAge", "targetAmount") SELECT 1, "assetTypeId", "collectedMode", "deadline", "id", "manualCollected", "name", "note", "priority", "startMonth", "targetAge", "targetAmount" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");
CREATE TABLE "new_Investment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "platformId" INTEGER,
    "assetTypeId" INTEGER,
    "description" TEXT,
    "principal" INTEGER NOT NULL DEFAULT 0,
    "currentValue" INTEGER,
    "valueUpdatedAt" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Investment_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Investment_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Investment" ("userId", "assetTypeId", "currentValue", "description", "id", "platformId", "principal", "sortOrder", "valueUpdatedAt") SELECT 1, "assetTypeId", "currentValue", "description", "id", "platformId", "principal", "sortOrder", "valueUpdatedAt" FROM "Investment";
DROP TABLE "Investment";
ALTER TABLE "new_Investment" RENAME TO "Investment";
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");
CREATE TABLE "new_MonthlyPeriod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "month" TEXT NOT NULL,
    "salary" INTEGER,
    "isPlan" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonthlyPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MonthlyPeriod" ("userId", "createdAt", "id", "isPlan", "month", "note", "salary", "updatedAt") SELECT 1, "createdAt", "id", "isPlan", "month", "note", "salary", "updatedAt" FROM "MonthlyPeriod";
DROP TABLE "MonthlyPeriod";
ALTER TABLE "new_MonthlyPeriod" RENAME TO "MonthlyPeriod";
CREATE UNIQUE INDEX "MonthlyPeriod_userId_month_key" ON "MonthlyPeriod"("userId", "month");
CREATE TABLE "new_PhysicalAsset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PhysicalAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PhysicalAsset" ("userId", "id", "name", "note", "sortOrder", "value") SELECT 1, "id", "name", "note", "sortOrder", "value" FROM "PhysicalAsset";
DROP TABLE "PhysicalAsset";
ALTER TABLE "new_PhysicalAsset" RENAME TO "PhysicalAsset";
CREATE INDEX "PhysicalAsset_userId_idx" ON "PhysicalAsset"("userId");
CREATE TABLE "new_Platform" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Platform_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Platform" ("userId", "id", "name", "sortOrder") SELECT 1, "id", "name", "sortOrder" FROM "Platform";
DROP TABLE "Platform";
ALTER TABLE "new_Platform" RENAME TO "Platform";
CREATE UNIQUE INDEX "Platform_userId_name_key" ON "Platform"("userId", "name");
CREATE TABLE "new_PortfolioTarget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "month" TEXT NOT NULL,
    "assetTypeId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "PortfolioTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortfolioTarget_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PortfolioTarget" ("userId", "amount", "assetTypeId", "id", "month") SELECT 1, "amount", "assetTypeId", "id", "month" FROM "PortfolioTarget";
DROP TABLE "PortfolioTarget";
ALTER TABLE "new_PortfolioTarget" RENAME TO "PortfolioTarget";
CREATE INDEX "PortfolioTarget_userId_idx" ON "PortfolioTarget"("userId");
CREATE UNIQUE INDEX "PortfolioTarget_month_assetTypeId_key" ON "PortfolioTarget"("month", "assetTypeId");
CREATE TABLE "new_Receivable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CICILAN',
    "principal" INTEGER NOT NULL DEFAULT 0,
    "installmentCount" INTEGER NOT NULL DEFAULT 0,
    "installmentAmount" INTEGER NOT NULL DEFAULT 0,
    "dueDay" INTEGER,
    "startMonth" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receivable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Receivable" ("userId", "createdAt", "dueDay", "id", "installmentAmount", "installmentCount", "kind", "name", "note", "principal", "startMonth") SELECT 1, "createdAt", "dueDay", "id", "installmentAmount", "installmentCount", "kind", "name", "note", "principal", "startMonth" FROM "Receivable";
DROP TABLE "Receivable";
ALTER TABLE "new_Receivable" RENAME TO "Receivable";
CREATE INDEX "Receivable_userId_idx" ON "Receivable"("userId");
CREATE TABLE "new_ReceivableEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "receivableId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "ReceivableEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReceivableEntry_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReceivableEntry" ("userId", "amount", "date", "description", "id", "receivableId") SELECT 1, "amount", "date", "description", "id", "receivableId" FROM "ReceivableEntry";
DROP TABLE "ReceivableEntry";
ALTER TABLE "new_ReceivableEntry" RENAME TO "ReceivableEntry";
CREATE INDEX "ReceivableEntry_receivableId_idx" ON "ReceivableEntry"("receivableId");
CREATE INDEX "ReceivableEntry_userId_idx" ON "ReceivableEntry"("userId");
CREATE TABLE "new_ReceivableInstallment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "receivableId" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    CONSTRAINT "ReceivableInstallment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReceivableInstallment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReceivableInstallment" ("userId", "amount", "id", "month", "paid", "paidAt", "receivableId", "seq") SELECT 1, "amount", "id", "month", "paid", "paidAt", "receivableId", "seq" FROM "ReceivableInstallment";
DROP TABLE "ReceivableInstallment";
ALTER TABLE "new_ReceivableInstallment" RENAME TO "ReceivableInstallment";
CREATE INDEX "ReceivableInstallment_userId_idx" ON "ReceivableInstallment"("userId");
CREATE UNIQUE INDEX "ReceivableInstallment_receivableId_seq_key" ON "ReceivableInstallment"("receivableId", "seq");
CREATE TABLE "new_RecurringTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "defaultAmount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "debtId" INTEGER,
    CONSTRAINT "RecurringTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringTemplate_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RecurringTemplate" ("userId", "active", "categoryId", "debtId", "defaultAmount", "id", "name", "sortOrder") SELECT 1, "active", "categoryId", "debtId", "defaultAmount", "id", "name", "sortOrder" FROM "RecurringTemplate";
DROP TABLE "RecurringTemplate";
ALTER TABLE "new_RecurringTemplate" RENAME TO "RecurringTemplate";
CREATE INDEX "RecurringTemplate_userId_idx" ON "RecurringTemplate"("userId");
CREATE TABLE "new_Resolution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Resolution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Resolution" ("userId", "done", "id", "sortOrder", "text", "year") SELECT 1, "done", "id", "sortOrder", "text", "year" FROM "Resolution";
DROP TABLE "Resolution";
ALTER TABLE "new_Resolution" RENAME TO "Resolution";
CREATE INDEX "Resolution_userId_idx" ON "Resolution"("userId");
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
    CONSTRAINT "Transaction_receivableEntryId_fkey" FOREIGN KEY ("receivableEntryId") REFERENCES "ReceivableEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("userId", "amount", "categoryId", "createdAt", "debtPlanId", "goalId", "id", "importKey", "investmentId", "isPaid", "name", "note", "periodId", "receivableEntryId", "receivableInstallmentId", "sortOrder", "source", "updatedAt") SELECT 1, "amount", "categoryId", "createdAt", "debtPlanId", "goalId", "id", "importKey", "investmentId", "isPaid", "name", "note", "periodId", "receivableEntryId", "receivableInstallmentId", "sortOrder", "source", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_debtPlanId_key" ON "Transaction"("debtPlanId");
CREATE UNIQUE INDEX "Transaction_receivableInstallmentId_key" ON "Transaction"("receivableInstallmentId");
CREATE UNIQUE INDEX "Transaction_receivableEntryId_key" ON "Transaction"("receivableEntryId");
CREATE INDEX "Transaction_periodId_idx" ON "Transaction"("periodId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_goalId_idx" ON "Transaction"("goalId");
CREATE UNIQUE INDEX "Transaction_userId_importKey_key" ON "Transaction"("userId", "importKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

