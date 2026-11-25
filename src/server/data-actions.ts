"use server";

import { parseBackup } from "@/lib/backup";
import { requireAuth } from "./auth";
import { isInternalError, refresh } from "./action-utils";
import { restoreAll } from "./backup";

const MAX_BYTES = 4 * 1024 * 1024;

export type RestoreResult = { ok: true; counts: Record<string, number>; exportedAt: string } | { ok: false; error: string };

/** Pulihkan dari file backup JSON. Mengganti SEMUA data. */
export async function restoreBackup(formData: FormData): Promise<RestoreResult> {
  await requireAuth();
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file backup (.json)" };
    if (file.size > MAX_BYTES) return { ok: false, error: "File terlalu besar (maks. 4 MB)" };
    if (formData.get("confirm") !== "PULIHKAN") return { ok: false, error: "Ketik PULIHKAN untuk konfirmasi" };
    const parsed = parseBackup(await file.text());
    const counts = await restoreAll(parsed.tables);
    refresh();
    return { ok: true, counts, exportedAt: parsed.exportedAt };
  } catch (e) {
    if (isInternalError(e)) {
      console.error(e);
      return { ok: false, error: "Gagal memulihkan: isi backup tidak cocok dengan database. Tidak ada data yang berubah." };
    }
    return { ok: false, error: (e as Error).message };
  }
}
