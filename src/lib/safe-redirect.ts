/**
 * Hanya izinkan redirect ke path internal aplikasi.
 * Menolak URL absolut, "//host", "/\host" (browser menganggapnya "//host"),
 * karakter kontrol, dan apa pun yang setelah di-parse berpindah origin.
 */
export function safeRedirect(from: unknown, fallback = "/"): string {
  if (typeof from !== "string" || from.length === 0 || from.length > 500) return fallback;
  if (!from.startsWith("/") || from.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(from)) return fallback;
  try {
    const base = "http://internal.invalid";
    const u = new URL(from, base);
    if (u.origin !== base) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
