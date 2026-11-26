import "server-only";
import { getSessionUser, type SessionUser } from "@/lib/session-user";

/** Lapis kedua di setiap server action (selain proxy): sesi valid dan akun masih ada. */
export async function requireAuth(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new Error("Tidak terautentikasi");
  return u;
}

/** Hanya admin (kelola akun). */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireAuth();
  if (!u.isAdmin) throw new Error("Hanya admin yang boleh melakukan ini");
  return u;
}
