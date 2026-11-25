"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { findDuplicate } from "@/lib/money";
import { zAmountNonNeg, zCreatePeriod, zTransactionInput, type TransactionInput } from "@/lib/schemas";
import { formatMonth, formatRupiah } from "@/lib/format";
import { requireAuth } from "./auth";
import { isInternalError } from "./action-utils";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; duplicate: string };

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Input tidak valid" };
  if (isInternalError(e)) {
    console.error(e);
    return { ok: false, error: "Data tidak ditemukan atau sudah berubah. Muat ulang halaman lalu coba lagi." };
  }
  return { ok: false, error: (e as Error).message };
}

function refresh() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Bulan
// ---------------------------------------------------------------------------

export async function createPeriod(input: z.input<typeof zCreatePeriod>): Promise<ActionResult> {
  await requireAuth();
  let month: string;
  try {
    const data = zCreatePeriod.parse(input);
    month = data.month;
    // Aturan 3: satu bulan = satu sumber data
    if (await db.monthlyPeriod.findUnique({ where: { month } })) {
      return { ok: false, error: `${formatMonth(month)} sudah ada` };
    }

    let salary: number | null = null;
    let items: { name: string; categoryId: number; amount: number | null; note?: string | null; source: string }[] = [];

    if (data.source === "template") {
      const templates = await db.recurringTemplate.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
      items = templates.map((t) => ({ name: t.name, categoryId: t.categoryId, amount: t.defaultAmount, source: "TEMPLATE" }));
      const prev = await db.monthlyPeriod.findFirst({ where: { month: { lt: month } }, orderBy: { month: "desc" } });
      salary = prev?.salary ?? null;
    } else if (data.source === "copyPrev") {
      const prev = await db.monthlyPeriod.findFirst({
        where: { month: { lt: month } },
        orderBy: { month: "desc" },
        include: { transactions: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
      });
      if (!prev) return { ok: false, error: "Belum ada bulan sebelumnya untuk disalin" };
      salary = prev.salary;
      // Transaksi otomatis (hutang/piutang) tidak disalin agar tidak dobel
      items = prev.transactions
        .filter((t) => t.source !== "DEBT_PLAN" && t.source !== "RECEIVABLE")
        .map((t) => ({ name: t.name, categoryId: t.categoryId, amount: t.amount, note: t.note, source: "MANUAL" }));
    }

    await db.monthlyPeriod.create({
      data: {
        month,
        isPlan: data.isPlan,
        salary,
        transactions: { create: items.map((it, i) => ({ ...it, isPaid: false, sortOrder: i + 1 })) },
      },
    });
  } catch (e) {
    return fail(e);
  }
  refresh();
  redirect(`/bulanan/${month}`);
}

const zUpdatePeriod = z.object({
  id: z.number().int(),
  salary: zAmountNonNeg.optional(),
  isPlan: z.boolean().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function updatePeriod(input: z.input<typeof zUpdatePeriod>): Promise<ActionResult> {
  await requireAuth();
  try {
    const { id, ...data } = zUpdatePeriod.parse(input);
    await db.monthlyPeriod.update({ where: { id }, data });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

export async function deletePeriod(id: number): Promise<ActionResult> {
  await requireAuth();
  try {
    await db.monthlyPeriod.delete({ where: { id } });
  } catch (e) {
    return fail(e);
  }
  refresh();
  redirect("/bulanan");
}

/** Tambahkan item template yang belum ada (berdasarkan nama) ke bulan yang sudah ada. */
export async function addMissingTemplates(periodId: number): Promise<ActionResult & { added?: number }> {
  await requireAuth();
  let added = 0;
  try {
    const [templates, existing] = await Promise.all([
      db.recurringTemplate.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      db.transaction.findMany({ where: { periodId }, select: { name: true, sortOrder: true } }),
    ]);
    const names = new Set(existing.map((t) => t.name.trim().toLowerCase()));
    let order = Math.max(0, ...existing.map((t) => t.sortOrder));
    const missing = templates.filter((t) => !names.has(t.name.trim().toLowerCase()));
    await db.transaction.createMany({
      data: missing.map((t) => ({
        periodId,
        name: t.name,
        categoryId: t.categoryId,
        amount: t.defaultAmount,
        source: "TEMPLATE",
        sortOrder: ++order,
      })),
    });
    added = missing.length;
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true, added };
}

// ---------------------------------------------------------------------------
// Transaksi
// ---------------------------------------------------------------------------

async function assertCategory(categoryId: number) {
  const c = await db.category.findUnique({ where: { id: categoryId } });
  if (!c) throw new Error("Kategori tidak ditemukan");
}

async function duplicateMessage(periodId: number, data: TransactionInput, ignoreId?: number) {
  const existing = await db.transaction.findMany({
    where: { periodId },
    select: { id: true, name: true, amount: true },
  });
  const dup = findDuplicate(existing, data, ignoreId);
  if (!dup) return null;
  const period = await db.monthlyPeriod.findUniqueOrThrow({ where: { id: periodId } });
  return `"${dup.name}" ${formatRupiah(dup.amount)} sudah ada di ${formatMonth(period.month)}. Tetap simpan?`;
}

export async function createTransaction(
  periodId: number,
  input: z.input<typeof zTransactionInput>,
  confirmDuplicate = false,
): Promise<ActionResult> {
  await requireAuth();
  try {
    const data = zTransactionInput.parse(input);
    await assertCategory(data.categoryId);
    // Aturan 4: konfirmasi jika nama + nominal + bulan sama
    if (!confirmDuplicate) {
      const msg = await duplicateMessage(periodId, data);
      if (msg) return { ok: false, duplicate: msg };
    }
    const max = await db.transaction.aggregate({ where: { periodId }, _max: { sortOrder: true } });
    await db.transaction.create({
      data: { ...data, note: data.note || null, periodId, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

export async function updateTransaction(
  id: number,
  input: z.input<typeof zTransactionInput>,
  confirmDuplicate = false,
): Promise<ActionResult> {
  await requireAuth();
  try {
    const data = zTransactionInput.parse(input);
    await assertCategory(data.categoryId);
    const tx = await db.transaction.findUniqueOrThrow({ where: { id } });
    if (!confirmDuplicate) {
      const msg = await duplicateMessage(tx.periodId, data, id);
      if (msg) return { ok: false, duplicate: msg };
    }
    await db.transaction.update({ where: { id }, data: { ...data, note: data.note || null } });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

export async function setTransactionPaid(id: number, isPaid: boolean): Promise<ActionResult> {
  await requireAuth();
  try {
    await db.transaction.update({ where: { id }, data: { isPaid } });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

export async function deleteTransaction(id: number): Promise<ActionResult> {
  await requireAuth();
  try {
    await db.transaction.delete({ where: { id } });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pengaturan: kategori & template
// ---------------------------------------------------------------------------

const zCategoryTargets = z.array(
  z.object({ id: z.number().int(), targetBps: z.number().int().min(0).max(10000) }),
);

export async function updateCategoryTargets(input: z.input<typeof zCategoryTargets>): Promise<ActionResult> {
  await requireAuth();
  try {
    const rows = zCategoryTargets.parse(input);
    await db.$transaction(rows.map((r) => db.category.update({ where: { id: r.id }, data: { targetBps: r.targetBps } })));
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

const zTemplate = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(120),
  categoryId: z.number().int().positive("Kategori wajib dipilih"),
  defaultAmount: zAmountNonNeg,
  active: z.boolean(),
});

export async function saveTemplate(id: number | null, input: z.input<typeof zTemplate>): Promise<ActionResult> {
  await requireAuth();
  try {
    const data = zTemplate.parse(input);
    await assertCategory(data.categoryId);
    if (id) {
      await db.recurringTemplate.update({ where: { id }, data });
    } else {
      const max = await db.recurringTemplate.aggregate({ _max: { sortOrder: true } });
      await db.recurringTemplate.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    }
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

export async function deleteTemplate(id: number): Promise<ActionResult> {
  await requireAuth();
  try {
    await db.recurringTemplate.delete({ where: { id } });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}
