-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecurringTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "defaultAmount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "debtId" INTEGER,
    CONSTRAINT "RecurringTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringTemplate_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RecurringTemplate" ("active", "categoryId", "defaultAmount", "id", "name", "sortOrder") SELECT "active", "categoryId", "defaultAmount", "id", "name", "sortOrder" FROM "RecurringTemplate";
DROP TABLE "RecurringTemplate";
ALTER TABLE "new_RecurringTemplate" RENAME TO "RecurringTemplate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
