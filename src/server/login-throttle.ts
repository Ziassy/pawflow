import "server-only";
import { baseDb as db } from "@/lib/db-base";
import { GLOBAL, PER_IP, lockRemaining, recordFailure, type ThrottlePolicy, type ThrottleState } from "@/lib/throttle";

// Disimpan di DB agar berlaku di semua instance server (Vercel). Hanya disentuh saat login.

async function load(key: string): Promise<ThrottleState | null> {
  const r = await db.loginThrottle.findUnique({ where: { key } });
  return r ? { failures: r.failures, windowStart: r.windowStart.getTime(), lockedUntil: r.lockedUntil?.getTime() ?? null, lockCount: r.lockCount } : null;
}

async function save(key: string, s: ThrottleState) {
  const data = { failures: s.failures, windowStart: new Date(s.windowStart), lockedUntil: s.lockedUntil ? new Date(s.lockedUntil) : null, lockCount: s.lockCount };
  await db.loginThrottle.upsert({ where: { key }, update: data, create: { key, ...data } });
}

/** Sisa waktu terkunci (ms) untuk IP ini atau global; 0 = boleh mencoba. */
export async function loginLockRemaining(ip: string, now = Date.now()): Promise<number> {
  const [a, b] = await Promise.all([load(`ip:${ip}`), load("global")]);
  return Math.max(lockRemaining(a, now), lockRemaining(b, now));
}

export async function recordLoginFailure(ip: string, now = Date.now()) {
  const apply = async (key: string, p: ThrottlePolicy) => save(key, recordFailure(await load(key), now, p));
  await Promise.all([apply(`ip:${ip}`, PER_IP), apply("global", GLOBAL)]);
}

export async function recordLoginSuccess(ip: string) {
  await db.loginThrottle.deleteMany({ where: { key: `ip:${ip}` } });
}
