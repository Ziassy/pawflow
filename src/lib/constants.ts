import { z } from "zod";

// Nilai "enum" yang disimpan sebagai String di DB. Validasi di sini.

export const CATEGORY_KIND = ["EXPENSE", "INCOME"] as const;
export const TX_SOURCE = ["MANUAL", "TEMPLATE", "IMPORT", "DEBT_PLAN", "RECEIVABLE"] as const;
export const DEBT_KIND = ["KARTU", "PAYLATER", "PRIBADI", "LAINNYA"] as const;
export const GOAL_COLLECTED_MODE = ["MANUAL", "ASSET_TYPE", "TRANSACTIONS"] as const;

export const zDebtKind = z.enum(DEBT_KIND);
export const zGoalCollectedMode = z.enum(GOAL_COLLECTED_MODE);

export const DEBT_KIND_LABEL: Record<(typeof DEBT_KIND)[number], string> = {
  KARTU: "Kartu kredit",
  PAYLATER: "Paylater",
  PRIBADI: "Pribadi (ke orang)",
  LAINNYA: "Lainnya",
};

/** Nama kategori pemasukan (uang masuk selain gaji). */
export const INCOME_CATEGORY = "Pemasukan";

/** Status bulan, diturunkan otomatis — tidak pernah disimpan. */
export type PeriodStatus = "Tercatat" | "Rencana" | "Tidak lengkap";
