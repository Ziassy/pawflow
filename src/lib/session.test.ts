import { beforeAll, describe, expect, it } from "vitest";
import { checkPassword, createSessionToken, verifySessionToken } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "x".repeat(40);
  process.env.APP_PASSWORD = "rahasia";
});

describe("session", () => {
  it("token valid bisa diverifikasi", async () => {
    const t = await createSessionToken();
    expect(await verifySessionToken(t)).toBe(true);
  });
  it("token diubah / kedaluwarsa ditolak", async () => {
    const t = await createSessionToken(0);
    expect(await verifySessionToken(t)).toBe(false); // exp sudah lewat
    const good = await createSessionToken();
    const [exp, sig] = good.split(".");
    expect(await verifySessionToken(`${Number(exp) + 1}.${sig}`)).toBe(false);
    expect(await verifySessionToken(undefined)).toBe(false);
    expect(await verifySessionToken("abc")).toBe(false);
  });
  it("cek password", async () => {
    expect(await checkPassword("rahasia")).toBe(true);
    expect(await checkPassword("salah")).toBe(false);
  });
});

import { isWeakPassword } from "./session";

describe("isWeakPassword", () => {
  it("minimal 6 karakter dan bukan password default", () => {
    expect(isWeakPassword("abc12")).toBe(true);
    expect(isWeakPassword("abc123")).toBe(false);
    expect(isWeakPassword("ganti-password-ini")).toBe(true);
    expect(isWeakPassword("123456")).toBe(true);
    expect(isWeakPassword(undefined)).toBe(true);
  });
});
