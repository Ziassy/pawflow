import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("path internal diizinkan", () => {
    expect(safeRedirect("/bulanan/2026-11")).toBe("/bulanan/2026-11");
    expect(safeRedirect("/transaksi?q=kuota&bulan=2026-10")).toBe("/transaksi?q=kuota&bulan=2026-10");
  });
  it.each([
    ["https://evil.com", "URL absolut"],
    ["//evil.com", "protocol-relative"],
    ["/\\evil.com", "backslash"],
    ["/\\/evil.com", "backslash campur"],
    ["/%0d%0aSet-Cookie:x", "aman karena di-encode, tetap internal"],
    ["\t//evil.com", "spasi/tab di depan"],
    ["/\u0000//evil.com", "karakter kontrol"],
    ["javascript:alert(1)", "javascript:"],
    ["", "kosong"],
  ])("menolak/menetralkan %s (%s)", (input) => {
    const out = safeRedirect(input);
    expect(out.startsWith("/")).toBe(true);
    expect(out.startsWith("//")).toBe(false);
    expect(new URL(out, "http://app.test").origin).toBe("http://app.test");
  });
  it("tipe selain string -> fallback", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect(123)).toBe("/");
  });
});
