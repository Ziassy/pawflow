// Kebijakan pembatasan percobaan login (murni, tanpa DB).

export type ThrottleState = { failures: number; windowStart: number; lockedUntil: number | null; lockCount: number };
export type ThrottlePolicy = { maxFailures: number; windowMs: number; baseLockMs: number; maxLockMs: number };

const MIN = 60_000;
/** Per IP: 5 salah / 15 menit -> kunci 15 menit, berlipat 2 tiap kunci ulang (maks 24 jam). */
export const PER_IP: ThrottlePolicy = { maxFailures: 5, windowMs: 15 * MIN, baseLockMs: 15 * MIN, maxLockMs: 24 * 60 * MIN };
/** Global: 30 salah / 15 menit dari semua IP -> kunci 15 menit (maks 2 jam). */
export const GLOBAL: ThrottlePolicy = { maxFailures: 30, windowMs: 15 * MIN, baseLockMs: 15 * MIN, maxLockMs: 120 * MIN };

export const emptyState = (now: number): ThrottleState => ({ failures: 0, windowStart: now, lockedUntil: null, lockCount: 0 });

/** Sisa waktu terkunci (ms), 0 jika tidak terkunci. */
export function lockRemaining(s: ThrottleState | null, now: number): number {
  return s?.lockedUntil && s.lockedUntil > now ? s.lockedUntil - now : 0;
}

export function recordFailure(s: ThrottleState | null, now: number, p: ThrottlePolicy): ThrottleState {
  const st = s ? { ...s } : emptyState(now);
  if (now - st.windowStart > p.windowMs) {
    st.failures = 0;
    st.windowStart = now;
  }
  st.failures += 1;
  if (st.failures >= p.maxFailures) {
    st.lockCount += 1;
    st.lockedUntil = now + Math.min(p.maxLockMs, p.baseLockMs * 2 ** (st.lockCount - 1));
    st.failures = 0;
    st.windowStart = now;
  }
  return st;
}
