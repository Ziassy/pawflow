// Sesi satu pengguna: cookie berisi "<expiresAtMs>.<hmac>" yang ditandatangani
// SESSION_SECRET (HMAC-SHA256). Memakai Web Crypto agar jalan di proxy & server.

export const SESSION_COOKIE = "ck_session";
/** Nama cookie di HTTPS: prefix __Host- memaksa Secure, Path=/, tanpa Domain (tidak bisa ditimpa subdomain). */
export const SESSION_COOKIE_SECURE = "__Host-ck_session";

/** Ambil token dari salah satu nama cookie. */
export function readSessionCookie(get: (name: string) => { value: string } | undefined): string | undefined {
  return get(SESSION_COOKIE_SECURE)?.value ?? get(SESSION_COOKIE)?.value;
}

/** Password default / terlalu pendek tidak boleh dipakai di produksi. */
export const DEFAULT_PASSWORDS = ["ganti-password-ini", "password", "admin", "123456"];
export function isWeakPassword(pw: string | undefined): boolean {
  return !pw || pw.length < 6 || DEFAULT_PASSWORDS.includes(pw.toLowerCase());
}
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 hari

const enc = new TextEncoder();

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET wajib diisi (min. 32 karakter)");
  return s;
}

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Bandingkan dua string dengan waktu konstan (panjang sama). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const exp = String(now + SESSION_MAX_AGE_SEC * 1000);
  return `${exp}.${await hmacHex(exp)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < now) return false;
  return safeEqual(sig, await hmacHex(exp));
}

/** Cek password terhadap APP_PASSWORD; hash dulu agar panjang sama. */
export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD belum diset");
  const [a, b] = await Promise.all([hmacHex(`pw:${input}`), hmacHex(`pw:${expected}`)]);
  return safeEqual(a, b);
}
