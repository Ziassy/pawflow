import { beforeAll, describe, expect, it } from "vitest";
import { checkAppPassword, createSessionToken, verifySessionToken } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "x".repeat(40);
  process.env.APP_PASSWORD = "rahasia";
});

describe("session", () => {
  it("token valid membawa userId dan versi sesi", async () => {
    const t = await createSessionToken({ userId: 7, version: 3 });
    expect(await verifySessionToken(t)).toEqual({ userId: 7, version: 3 });
  });
  it("token diubah / kedaluwarsa / format lama ditolak", async () => {
    expect(await verifySessionToken(await createSessionToken({ userId: 1, version: 1 }, 0))).toBeNull(); // exp sudah lewat
    const [, version, exp, sig] = (await createSessionToken({ userId: 1, version: 1 })).split(".");
    // Ganti userId tanpa tanda tangan baru = ditolak (tidak bisa menyamar jadi akun lain)
    expect(await verifySessionToken(`2.${version}.${exp}.${sig}`)).toBeNull();
    expect(await verifySessionToken(`1.${version}.${Number(exp) + 1}.${sig}`)).toBeNull();
    expect(await verifySessionToken(`${exp}.${sig}`)).toBeNull(); // token satu-pengguna lama
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("abc")).toBeNull();
  });
  it("cek password", async () => {
    expect(await checkAppPassword("rahasia")).toBe(true);
    expect(await checkAppPassword("salah")).toBe(false);
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
