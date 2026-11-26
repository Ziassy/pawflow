"use client";

import { ThemeProvider as NextThemes } from "next-themes";

/**
 * Wrapper next-themes. Attribute `class` agar .dark selector di globals.css aktif.
 * Default "light" karena app keuangan pribadi; pengguna bisa ganti di Pengaturan.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
