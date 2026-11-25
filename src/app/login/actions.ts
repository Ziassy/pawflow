"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_SECURE,
  SESSION_MAX_AGE_SEC,
  checkPassword,
  createSessionToken,
  isWeakPassword,
} from "@/lib/session";
import { safeRedirect } from "@/lib/safe-redirect";
import { loginLockRemaining, recordLoginFailure, recordLoginSuccess } from "@/server/login-throttle";

export type LoginState = { error?: string };

const schema = z.object({
  password: z.string().min(1, "Password wajib diisi").max(200),
  from: z.string().max(500).optional(),
});

async function clientInfo() {
  const h = await headers();
  // Di Vercel, x-forwarded-for diisi oleh platform (IP asli klien di urutan pertama)
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
  // Diisi Next.js / Vercel sesuai protokol asli. Cookie Secure hanya di HTTPS (http lokal tetap bisa login).
  const https = h.get("x-forwarded-proto")?.split(",")[0].trim() === "https";
  return { ip, https };
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    password: formData.get("password"),
    from: formData.get("from") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Server produksi wajib memakai password kuat (bukan default)
  if (process.env.NODE_ENV === "production" && isWeakPassword(process.env.APP_PASSWORD)) {
    return { error: "Login dinonaktifkan: APP_PASSWORD di server masih default/terlalu pendek (min. 6 karakter)." };
  }

  const { ip, https } = await clientInfo();
  const locked = await loginLockRemaining(ip);
  if (locked > 0) {
    return { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(locked / 60_000)} menit.` };
  }

  if (!(await checkPassword(parsed.data.password))) {
    await recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400)); // perlambat tebakan
    return { error: "Password salah" };
  }
  await recordLoginSuccess(ip);

  const jar = await cookies();
  const opts = { httpOnly: true, secure: https, sameSite: "lax" as const, path: "/", maxAge: SESSION_MAX_AGE_SEC };
  jar.set(https ? SESSION_COOKIE_SECURE : SESSION_COOKIE, await createSessionToken(), opts);
  redirect(safeRedirect(parsed.data.from));
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete({ name: SESSION_COOKIE_SECURE, path: "/", secure: true });
  redirect("/login");
}
