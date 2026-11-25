import "server-only";
import { cookies } from "next/headers";
import { readSessionCookie, verifySessionToken } from "@/lib/session";

/** Lapis kedua di setiap server action (selain proxy). */
export async function requireAuth() {
  const jar = await cookies();
  const token = readSessionCookie((n) => jar.get(n));
  if (!(await verifySessionToken(token))) throw new Error("Tidak terautentikasi");
}
