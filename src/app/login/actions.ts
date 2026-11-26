"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_COOKIE_SECURE, checkAppPassword, isWeakPassword } from "@/lib/session";
import { baseDb } from "@/lib/db-base";
import { hashPassword, normalizeUsername, verifyPassword } from "@/lib/password";
import { safeRedirect } from "@/lib/safe-redirect";
import { clientInfo, setSessionCookie } from "@/server/session-cookie";
import { loginLockRemaining, recordLoginFailure, recordLoginSuccess } from "@/server/login-throttle";

export type LoginState = { error?: string };

const schema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi").max(64),
  password: z.string().min(1, "Password wajib diisi").max(200),
  from: z.string().max(500).optional(),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    from: formData.get("from") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { ip } = await clientInfo();
  const locked = await loginLockRemaining(ip);
  if (locked > 0) {
    return { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(locked / 60_000)} menit.` };
  }

  const user = await baseDb.user.findUnique({ where: { username: normalizeUsername(parsed.data.username) } });
  let ok = false;
  if (user?.passwordHash) {
    ok = await verifyPassword(parsed.data.password, user.passwordHash);
  } else if (user) {
    // Akun hasil migrasi (belum punya password sendiri): login pertama memakai APP_PASSWORD,
    // lalu password itu disimpan sebagai hash milik akun ini.
    if (process.env.NODE_ENV === "production" && isWeakPassword(process.env.APP_PASSWORD)) {
      return { error: "Login pertama dinonaktifkan: APP_PASSWORD di server masih default/terlalu pendek (min. 6 karakter)." };
    }
    ok = await checkAppPassword(parsed.data.password);
    if (ok) await baseDb.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  } else {
    await hashPassword(parsed.data.password); // samakan waktu respons: username tidak bisa ditebak dari kecepatan
  }

  if (!ok || !user) {
    await recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400)); // perlambat tebakan
    return { error: "Username atau password salah" };
  }
  await recordLoginSuccess(ip);

  await setSessionCookie({ userId: user.id, version: user.sessionVersion });
  redirect(safeRedirect(parsed.data.from));
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete({ name: SESSION_COOKIE_SECURE, path: "/", secure: true });
  redirect("/login");
}
