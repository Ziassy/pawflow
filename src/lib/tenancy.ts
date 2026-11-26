// Peta kepemilikan data per akun (murni, tanpa DB). Dipakai oleh src/lib/db.ts
// dan restore backup. tenancy.test.ts memastikan peta ini cocok dengan schema.prisma.

/** Model yang TIDAK dimiliki akun mana pun (tidak punya kolom userId). */
export const UNSCOPED_MODELS = ["User", "LoginThrottle"] as const;

/** Delegate Prisma: "DebtPlan" -> "debtPlan". */
export const delegateKey = (model: string) => model[0].toLowerCase() + model.slice(1);

/**
 * Kolom foreign key ke data milik akun: model -> { kolom: model tujuan }.
 * Setiap tulis yang mengisi kolom ini dicek: baris tujuan harus milik akun yang sama.
 */
export const OWNED_FKS: Record<string, Record<string, string>> = {
  Transaction: {
    periodId: "MonthlyPeriod",
    categoryId: "Category",
    debtPlanId: "DebtPlan",
    receivableInstallmentId: "ReceivableInstallment",
    receivableEntryId: "ReceivableEntry",
    debtEntryId: "DebtEntry",
    goalId: "Goal",
    investmentId: "Investment",
  },
  RecurringTemplate: { categoryId: "Category", debtId: "Debt" },
  DebtSnapshot: { debtId: "Debt" },
  DebtPlan: { debtId: "Debt" },
  DebtEntry: { debtId: "Debt" },
  ReceivableEntry: { receivableId: "Receivable" },
  ReceivableInstallment: { receivableId: "Receivable" },
  Investment: { platformId: "Platform", assetTypeId: "AssetType" },
  AssetSnapshot: { assetTypeId: "AssetType" },
  PortfolioTarget: { assetTypeId: "AssetType" },
  Goal: { assetTypeId: "AssetType" },
};

/** Relasi list yang boleh dibuat lewat nested create: model -> { field relasi: model anak }. */
export const NESTED_CREATES: Record<string, Record<string, string>> = {
  MonthlyPeriod: { transactions: "Transaction" },
  Debt: { entries: "DebtEntry", snapshots: "DebtSnapshot", plans: "DebtPlan" },
  Receivable: { installments: "ReceivableInstallment", entries: "ReceivableEntry" },
};
