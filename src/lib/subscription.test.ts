import { describe, expect, it } from "vitest";
import { daysLeft, extendSubscription, isReadOnly, isSubscriptionExpired } from "./subscription";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
// 2026-11-26 20:00 WIB = 13:00 UTC
const now = new Date("2026-11-26T13:00:00Z");

describe("masa langganan", () => {
  it("hari terakhir masih aktif, besoknya berakhir; null = tanpa batas", () => {
    expect(isSubscriptionExpired(d("2026-11-26"), now)).toBe(false);
    expect(isSubscriptionExpired(d("2026-11-25"), now)).toBe(true);
    expect(isSubscriptionExpired(null, now)).toBe(false);
  });

  it("memakai tanggal WIB, bukan UTC", () => {
    // 27 Nov 01:00 WIB = 26 Nov 18:00 UTC: menurut WIB sudah tanggal 27
    expect(isSubscriptionExpired(d("2026-11-26"), new Date("2026-11-26T18:00:00Z"))).toBe(true);
  });

  it("admin tidak pernah read-only", () => {
    expect(isReadOnly({ isAdmin: true, subscriptionUntil: d("2020-01-01") }, now)).toBe(false);
    expect(isReadOnly({ isAdmin: false, subscriptionUntil: d("2020-01-01") }, now)).toBe(true);
    expect(isReadOnly({ isAdmin: false, subscriptionUntil: null }, now)).toBe(false);
  });

  it("sisa hari termasuk hari ini", () => {
    expect(daysLeft(d("2026-11-26"), now)).toBe(1);
    expect(daysLeft(d("2026-12-02"), now)).toBe(7);
    expect(daysLeft(d("2026-11-01"), now)).toBe(0);
    expect(daysLeft(null, now)).toBeNull();
  });

  it("perpanjang dari tanggal berakhir, atau dari hari ini bila sudah lewat", () => {
    expect(extendSubscription(d("2026-12-10"), 1, now)).toBe("2027-01-10");
    expect(extendSubscription(d("2026-01-10"), 3, now)).toBe("2027-02-26");
    expect(extendSubscription(null, 12, now)).toBe("2027-11-26");
    expect(extendSubscription(d("2027-01-31"), 1, now)).toBe("2027-02-28");
  });
});
