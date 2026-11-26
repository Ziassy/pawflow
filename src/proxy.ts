import { NextResponse, type NextRequest } from "next/server";
import { readSessionCookie, verifySessionToken } from "@/lib/session";

// Semua halaman wajib login, kecuali /login dan aset statis.
export async function proxy(request: NextRequest) {
  // Hanya cek tanda tangan & kedaluwarsa (tanpa DB). Akun dihapus / password diganti
  // ditolak di server lewat getSessionUser().
  const claims = await verifySessionToken(readSessionCookie((n) => request.cookies.get(n)));
  if (claims) return NextResponse.next();

  const url = new URL("/login", request.url);
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from !== "/") url.searchParams.set("from", from);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon|apple-icon|logo-|manifest.webmanifest|sw.js|offline.html).*)"],
};
