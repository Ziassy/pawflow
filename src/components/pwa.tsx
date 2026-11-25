"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type PwaWindow = Window & { __pawflowInstall?: InstallPromptEvent | null };

/** Daftarkan service worker. Hanya di production: di mode dev cache aset mengganggu hot reload. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Gagal daftar (mis. browser privat) tidak mengganggu app; hanya fitur offline yang hilang
    });
  }, []);
  return null;
}

type Mode = "loading" | "installed" | "prompt" | "ios" | "manual";

function detectMode(): Mode {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if ((window as PwaWindow).__pawflowInstall) return "prompt";
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "manual";
}

/** Panel pasang aplikasi: tombol di Android/Chrome, petunjuk di iOS Safari. */
export function InstallApp() {
  const [mode, setMode] = useState<Mode>("loading");

  useEffect(() => {
    const update = () => setMode(detectMode());
    update();
    window.addEventListener("pawflow:installable", update);
    return () => window.removeEventListener("pawflow:installable", update);
  }, []);

  async function install() {
    const w = window as PwaWindow;
    const evt = w.__pawflowInstall;
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    // Event hanya bisa dipakai sekali
    w.__pawflowInstall = null;
    setMode(outcome === "accepted" ? "installed" : detectMode());
  }

  if (mode === "loading") return <div className="h-10" aria-hidden />;

  if (mode === "installed") {
    return (
      <p className="flex items-center gap-2 text-sm text-positive">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        PawFlow sudah terpasang di perangkat ini.
      </p>
    );
  }

  if (mode === "prompt") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Pasang PawFlow di layar utama agar bisa dibuka seperti aplikasi biasa, tanpa bilah alamat browser.</p>
        <Button onClick={install}>
          <Download aria-hidden />
          Pasang PawFlow
        </Button>
      </div>
    );
  }

  if (mode === "ios") {
    return (
      <ol className="space-y-2.5 text-sm">
        <li className="flex gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">1</span>
          <span>
            Buka halaman ini di <strong>Safari</strong>, lalu ketuk tombol Bagikan <Share className="inline size-4 align-[-3px]" aria-label="Bagikan" />.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">2</span>
          <span>
            Pilih <strong>Tambah ke Layar Utama</strong> <SquarePlus className="inline size-4 align-[-3px]" aria-hidden />, lalu ketuk <strong>Tambah</strong>.
          </span>
        </li>
      </ol>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Buka menu browser (ikon titik tiga), lalu pilih <strong className="text-foreground">Instal aplikasi</strong> atau{" "}
      <strong className="text-foreground">Tambahkan ke layar utama</strong>. Di Android, gunakan Chrome.
    </p>
  );
}
