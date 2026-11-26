import "server-only";
import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, SESSION_COOKIE_SECURE, SESSION_MAX_AGE_SEC, createSessionToken, type SessionClaims } from "@/lib/session";

export async function clientInfo() {
  const h = await headers();
  // Di Vercel, x-forwarded-for diisi oleh platform (IP asli klien di urutan pertama)
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
  // Diisi Next.js / Vercel sesuai protokol asli. Cookie Secure hanya di HTTPS (http lokal tetap bisa login).
  const https = h.get("x-forwarded-proto")?.split(",")[0].trim() === "https";
  return { ip, https };
}

/** Tulis cookie sesi untuk akun (login, atau setelah ganti password agar sesi ini tetap berlaku). */
export async function setSessionCookie(claims: SessionClaims) {
  const { https } = await clientInfo();
  const jar = await cookies();
  const opts = { httpOnly: true, secure: https, sameSite: "lax" as const, path: "/", maxAge: SESSION_MAX_AGE_SEC };
  jar.set(https ? SESSION_COOKIE_SECURE : SESSION_COOKIE, await createSessionToken(claims), opts);
}
