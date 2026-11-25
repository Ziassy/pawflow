import { describe, expect, it } from "vitest";
import { GLOBAL, PER_IP, lockRemaining, recordFailure, type ThrottleState } from "./throttle";

const MIN = 60_000;

describe("throttle login", () => {
  it("5 salah -> terkunci 15 menit", () => {
    let s: ThrottleState | null = null;
    for (let i = 0; i < 4; i++) s = recordFailure(s, i * 1000, PER_IP);
    expect(lockRemaining(s, 5000)).toBe(0);
    s = recordFailure(s, 5000, PER_IP);
    expect(lockRemaining(s, 5000)).toBe(15 * MIN);
    expect(lockRemaining(s, 5000 + 15 * MIN)).toBe(0);
  });
  it("kunci berulang berlipat, dibatasi maksimum", () => {
    let s: ThrottleState | null = null;
    let t = 0;
    const locks: number[] = [];
    for (let round = 0; round < 10; round++) {
      for (let i = 0; i < 5; i++) s = recordFailure(s, t, PER_IP);
      locks.push(lockRemaining(s, t) / MIN);
      t += lockRemaining(s, t) + 1;
    }
    expect(locks.slice(0, 4)).toEqual([15, 30, 60, 120]);
    expect(Math.max(...locks)).toBe(24 * 60);
  });
  it("salah tersebar lebih dari 15 menit tidak dihitung bersama", () => {
    let s: ThrottleState | null = null;
    for (let i = 0; i < 10; i++) s = recordFailure(s, i * 16 * MIN, PER_IP);
    expect(lockRemaining(s, 10 * 16 * MIN)).toBe(0);
  });
  it("global: 30 salah", () => {
    let s: ThrottleState | null = null;
    for (let i = 0; i < 30; i++) s = recordFailure(s, i, GLOBAL);
    expect(lockRemaining(s, 29)).toBe(15 * MIN);
  });
});
