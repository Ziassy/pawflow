"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Bar tipis di atas layar selama pindah halaman (klik link internal). */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [route, setRoute] = useState(`${pathname}?${search}`);

  // Rute berubah -> selesai
  const now = `${pathname}?${search}`;
  if (now !== route) {
    setRoute(now);
    if (state === "loading") setState("done");
  }

  useEffect(() => {
    if (state !== "done") return;
    const t = setTimeout(() => setState("idle"), 300);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/pengaturan/backup")) return;
      if (url.pathname + url.search === location.pathname + location.search) return;
      setState("loading");
    };
    const onNav = () => setState("loading");
    document.addEventListener("click", onClick, true);
    window.addEventListener("app:navigate", onNav);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("app:navigate", onNav);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className="h-full bg-linear-90 from-hero-from to-hero-to shadow-[0_0_8px_var(--primary)]"
        style={{
          width: state === "idle" ? "0%" : state === "loading" ? "80%" : "100%",
          opacity: state === "idle" ? 0 : 1,
          transition:
            state === "loading" ? "width 8s cubic-bezier(.1,.7,.2,1), opacity .1s" : state === "done" ? "width .2s ease-out, opacity .3s .15s" : "none",
        }}
      />
    </div>
  );
}

/** Panggil sebelum router.push agar progress bar ikut jalan. */
export function signalNavigate() {
  window.dispatchEvent(new Event("app:navigate"));
}
