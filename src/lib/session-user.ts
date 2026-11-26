// Akun yang sedang login untuk request ini (server component, server action, route handler).
// Tidak memakai "server-only" agar src/lib/db.ts tetap bisa dimuat skrip CLI (tsx).
import { cache } from "react";
import { cookies } from "next/headers";
import { baseDb } from "./db-base";
import { readSessionCookie, verifySessionToken } from "./session";
import { dateKey, isReadOnly } from "./subscription";

export type SessionUser = {
  id: number;
  username: string;
  name: string;
  isAdmin: boolean;
  /** "YYYY-MM-DD" hari terakhir langganan aktif; null = tanpa batas */
  subscriptionUntil: string | null;
  /** Langganan berakhir (bukan admin): semua tulis data ditolak di src/lib/db.ts */
  readOnly: boolean;
};

/**
 * Cookie -> akun. null bila tidak login, tanda tangan salah, kedaluwarsa,
 * akun sudah dihapus, atau password sudah diganti sejak sesi dibuat.
 * Di-cache per request (server component) agar tidak query berulang.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  // React cache tidak berlaku di server action: memo manual per objek cookie request.
  const hit = perRequest.get(jar);
  if (hit) return hit;
  const p = lookup(readSessionCookie((n) => jar.get(n)));
  perRequest.set(jar, p);
  return p;
});

const perRequest = new WeakMap<object, Promise<SessionUser | null>>();

async function lookup(token: string | undefined): Promise<SessionUser | null> {
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  const u = await baseDb.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, username: true, name: true, isAdmin: true, sessionVersion: true, subscriptionUntil: true },
  });
  if (!u || u.sessionVersion !== claims.version) return null;
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    isAdmin: u.isAdmin,
    subscriptionUntil: u.subscriptionUntil ? dateKey(u.subscriptionUntil) : null,
    readOnly: isReadOnly(u),
  };
}
