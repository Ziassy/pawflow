// Hash password akun dengan scrypt (node:crypto). Format: "scrypt$<salt hex>$<hash hex>".
// Hanya untuk server (Node), bukan proxy.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEY_LEN = 64;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(pw, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Username: huruf kecil, angka, titik, strip, garis bawah. 3-32 karakter. */
export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const normalizeUsername = (u: string) => u.trim().toLowerCase();
