"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { baseDb } from "@/lib/db-base";
import { runAsUser } from "@/lib/db";
import { USERNAME_RE, hashPassword, normalizeUsername, verifyPassword } from "@/lib/password";
import { checkAppPassword } from "@/lib/session";
import { seedUserDefaults } from "@/lib/user-defaults";
import type { ActionResult } from "./actions";
import { fail } from "./action-utils";
import { requireAdmin, requireAuth } from "./auth";
import { deleteAllData } from "./backup";
import { setSessionCookie } from "./session-cookie";

const zName = z.string().trim().min(1, "Nama wajib diisi").max(60, "Nama maksimal 60 karakter");
const zUsername = z
  .string()
  .transform(normalizeUsername)
  .refine((u) => USERNAME_RE.test(u), "Username 3-32 karakter: huruf kecil, angka, titik, strip, atau garis bawah");
const zPassword = z.string().min(8, "Password minimal 8 karakter").max(200);

/** Pelanggaran unique username dari Prisma (P2002). */
const isDuplicate = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

async function act(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
  } catch (e) {
    if (isDuplicate(e)) return { ok: false, error: "Username sudah dipakai akun lain" };
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Akun sendiri
// ---------------------------------------------------------------------------

export async function updateProfile(input: { name: string; username: string }) {
  const me = await requireAuth();
  return act(async () => {
    const data = z.object({ name: zName, username: zUsername }).parse(input);
    await baseDb.user.update({ where: { id: me.id }, data });
  });
}

export async function changePassword(input: { current: string; next: string }) {
  const me = await requireAuth();
  return act(async () => {
    const data = z.object({ current: z.string().min(1, "Password sekarang wajib diisi"), next: zPassword }).parse(input);
    const u = await baseDb.user.findUniqueOrThrow({ where: { id: me.id } });
    const ok = u.passwordHash ? await verifyPassword(data.current, u.passwordHash) : await checkAppPassword(data.current);
    if (!ok) throw new Error("Password sekarang salah");
    // Versi sesi naik: semua perangkat lain yang login dengan password lama keluar otomatis
    const updated = await baseDb.user.update({
      where: { id: me.id },
      data: { passwordHash: await hashPassword(data.next), sessionVersion: { increment: 1 } },
    });
    await setSessionCookie({ userId: updated.id, version: updated.sessionVersion });
  });
}

// ---------------------------------------------------------------------------
// Kelola akun (admin)
// ---------------------------------------------------------------------------

export async function createUser(input: { name: string; username: string; password: string; isAdmin: boolean }) {
  await requireAdmin();
  return act(async () => {
    const data = z.object({ name: zName, username: zUsername, password: zPassword, isAdmin: z.boolean() }).parse(input);
    const user = await baseDb.user.create({
      data: { name: data.name, username: data.username, isAdmin: data.isAdmin, passwordHash: await hashPassword(data.password) },
    });
    // Akun baru mulai dengan kategori, template, jenis aset, dan platform bawaan
    await runAsUser(user.id, seedUserDefaults);
  });
}

export async function resetUserPassword(id: number, password: string) {
  const me = await requireAdmin();
  return act(async () => {
    if (id === me.id) throw new Error("Untuk akunmu sendiri, pakai Ganti password");
    const pw = zPassword.parse(password);
    await baseDb.user.update({ where: { id }, data: { passwordHash: await hashPassword(pw), sessionVersion: { increment: 1 } } });
  });
}

export async function setUserAdmin(id: number, isAdmin: boolean) {
  const me = await requireAdmin();
  return act(async () => {
    if (id === me.id) throw new Error("Status admin akunmu sendiri tidak bisa diubah di sini");
    await baseDb.user.update({ where: { id }, data: { isAdmin } });
  });
}

/** Hapus akun beserta SEMUA data keuangannya. Wajib ketik username sebagai konfirmasi. */
export async function deleteUser(id: number, confirmUsername: string) {
  const me = await requireAdmin();
  return act(async () => {
    if (id === me.id) throw new Error("Akunmu sendiri tidak bisa dihapus");
    const u = await baseDb.user.findUniqueOrThrow({ where: { id } });
    if (normalizeUsername(confirmUsername) !== u.username) throw new Error(`Ketik "${u.username}" untuk konfirmasi`);
    await runAsUser(id, deleteAllData);
    await baseDb.user.delete({ where: { id } });
  });
}
