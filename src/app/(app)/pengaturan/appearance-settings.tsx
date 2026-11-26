"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_THEMES, COLOR_THEME_COOKIE, type ColorThemeId } from "@/lib/color-themes";

const MODES = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
] as const;

const noopSubscribe = () => () => {};

function setColorCookie(id: ColorThemeId) {
  document.cookie = `${COLOR_THEME_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

export function AppearanceSettings({ currentColor }: { currentColor: ColorThemeId }) {
  const { theme, setTheme } = useTheme();
  // Tema dari next-themes baru diketahui di browser (localStorage). Saat SSR dan
  // render hidrasi pertama, anggap belum ada yang aktif agar HTML-nya sama.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [color, setColor] = useState<ColorThemeId>(currentColor);
  const [, startTransition] = useTransition();

  const pickColor = (id: ColorThemeId) => {
    setColor(id);
    setColorCookie(id);
    // Reload to apply server-rendered CSS vars
    startTransition(() => {
      window.location.reload();
    });
  };

  return (
    <div className="space-y-5">
      {/* Mode terang/gelap */}
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-muted-foreground">Mode tampilan</legend>
        <div className="flex gap-2">
          {MODES.map(({ value, label, icon: Icon }) => {
            const active = mounted && theme === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-accent text-foreground"
                    : "border-transparent bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Warna utama */}
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-muted-foreground">Warna utama</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {COLOR_THEMES.map((t) => {
            const active = t.id === color;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => pickColor(t.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-accent text-foreground"
                    : "border-transparent bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span
                  className="size-8 rounded-full shadow-sm ring-1 ring-black/10"
                  style={{ background: t.hex }}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
