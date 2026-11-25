-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "birthDate" TIMESTAMP(3),
    "depositRateBps" INTEGER NOT NULL DEFAULT 750,
    "interestTaxBps" INTEGER NOT NULL DEFAULT 2000,
    "assetDropAlertBps" INTEGER NOT NULL DEFAULT 3000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "lockCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'EXPENSE',
    "targetBps" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyPeriod" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "salary" INTEGER,
    "isPlan" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "defaultAmount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RecurringTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtSnapshot" (
    "id" SERIAL NOT NULL,
    "debtId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "balance" INTEGER NOT NULL,

    CONSTRAINT "DebtSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtPlan" (
    "id" SERIAL NOT NULL,
    "debtId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DebtPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtEntry" (
    "id" SERIAL NOT NULL,
    "debtId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "DebtEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receivable" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CICILAN',
    "principal" INTEGER NOT NULL DEFAULT 0,
    "installmentCount" INTEGER NOT NULL DEFAULT 0,
    "installmentAmount" INTEGER NOT NULL DEFAULT 0,
    "dueDay" INTEGER,
    "startMonth" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivableEntry" (
    "id" SERIAL NOT NULL,
    "receivableId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "ReceivableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivableInstallment" (
    "id" SERIAL NOT NULL,
    "receivableId" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "ReceivableInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssetType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" SERIAL NOT NULL,
    "platformId" INTEGER,
    "assetTypeId" INTEGER,
    "description" TEXT,
    "principal" INTEGER NOT NULL DEFAULT 0,
    "currentValue" INTEGER,
    "valueUpdatedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSnapshot" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "assetTypeId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "AssetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMonthNote" (
    "month" TEXT NOT NULL,
    "note" TEXT NOT NULL,

    CONSTRAINT "AssetMonthNote_pkey" PRIMARY KEY ("month")
);

-- CreateTable
CREATE TABLE "PortfolioTarget" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "assetTypeId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "PortfolioTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalAsset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PhysicalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" BIGINT NOT NULL,
    "deadline" TEXT,
    "collectedMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "manualCollected" BIGINT NOT NULL DEFAULT 0,
    "assetTypeId" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "targetAge" INTEGER,
    "note" TEXT,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resolution" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPeriod_month_key" ON "MonthlyPeriod"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_importKey_key" ON "Transaction"("importKey");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_debtPlanId_key" ON "Transaction"("debtPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_receivableInstallmentId_key" ON "Transaction"("receivableInstallmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_receivableEntryId_key" ON "Transaction"("receivableEntryId");

-- CreateIndex
CREATE INDEX "Transaction_periodId_idx" ON "Transaction"("periodId");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_goalId_idx" ON "Transaction"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "Debt_name_key" ON "Debt"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DebtSnapshot_debtId_month_key" ON "DebtSnapshot"("debtId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "DebtPlan_debtId_month_key" ON "DebtPlan"("debtId", "month");

-- CreateIndex
CREATE INDEX "ReceivableEntry_receivableId_idx" ON "ReceivableEntry"("receivableId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivableInstallment_receivableId_seq_key" ON "ReceivableInstallment"("receivableId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_name_key" ON "Platform"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AssetType_name_key" ON "AssetType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSnapshot_month_assetTypeId_key" ON "AssetSnapshot"("month", "assetTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioTarget_month_assetTypeId_key" ON "PortfolioTarget"("month", "assetTypeId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "MonthlyPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debtPlanId_fkey" FOREIGN KEY ("debtPlanId") REFERENCES "DebtPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_receivableInstallmentId_fkey" FOREIGN KEY ("receivableInstallmentId") REFERENCES "ReceivableInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_receivableEntryId_fkey" FOREIGN KEY ("receivableEntryId") REFERENCES "ReceivableEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtSnapshot" ADD CONSTRAINT "DebtSnapshot_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPlan" ADD CONSTRAINT "DebtPlan_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEntry" ADD CONSTRAINT "DebtEntry_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableEntry" ADD CONSTRAINT "ReceivableEntry_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableInstallment" ADD CONSTRAINT "ReceivableInstallment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSnapshot" ADD CONSTRAINT "AssetSnapshot_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioTarget" ADD CONSTRAINT "PortfolioTarget_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

