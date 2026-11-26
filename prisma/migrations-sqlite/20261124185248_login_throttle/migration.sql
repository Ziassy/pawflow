-- CreateTable
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStart" DATETIME NOT NULL,
    "lockedUntil" DATETIME,
    "lockCount" INTEGER NOT NULL DEFAULT 0
);
