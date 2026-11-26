"use client";

import { createContext, useContext } from "react";

/**
 * Akun hanya bisa melihat data (masa langganan berakhir). Diisi di (app)/layout dari sesi.
 * Dipakai untuk mematikan tombol tambah/edit/hapus di browser agar tidak ada request percuma;
 * penolakan sebenarnya tetap di server (src/lib/db.ts).
 */
const ReadOnlyContext = createContext(false);

export function ReadOnlyProvider({ readOnly, children }: { readOnly: boolean; children: React.ReactNode }) {
  return <ReadOnlyContext.Provider value={readOnly}>{children}</ReadOnlyContext.Provider>;
}

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}

/** Keterangan untuk title/aria-description kontrol yang dimatikan. */
export const READ_ONLY_HINT = "Masa langganan berakhir: hanya bisa melihat data";
