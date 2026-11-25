import { z } from "zod";
import { isMonthKey } from "./format";

export const zMonth = z.string().refine(isMonthKey, "Format bulan harus YYYY-MM");

/** Nominal Rupiah: integer atau null (belum diisi). Negatif = koreksi (mis. refund). */
export const zAmount = z
  .number({ error: "Nominal harus angka" })
  .int("Nominal harus bilangan bulat")
  .min(-2_000_000_000, "Nominal terlalu kecil")
  .max(2_000_000_000, "Nominal terlalu besar")
  .nullable();

/** Nominal yang tidak boleh negatif (gaji, target, saldo). */
export const zAmountNonNeg = zAmount.refine((v) => v === null || v >= 0, "Nominal tidak boleh negatif");

export const zTransactionInput = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(120),
  categoryId: z.number({ error: "Kategori wajib dipilih" }).int().positive("Kategori wajib dipilih"),
  amount: zAmount,
  isPaid: z.boolean(),
  note: z.string().trim().max(500).nullable().optional(),
  goalId: z.number().int().positive().nullable().optional(),
});
export type TransactionInput = z.infer<typeof zTransactionInput>;

export const zCreatePeriod = z.object({
  month: zMonth,
  isPlan: z.boolean(),
  source: z.enum(["empty", "template", "copyPrev"]),
});
