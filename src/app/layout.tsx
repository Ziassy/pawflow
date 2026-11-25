import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/pwa";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "PawFlow", template: "%s · PawFlow" },
  description: "PawFlow — Track your spending, find your flow.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "PawFlow", statusBarStyle: "default" },
  // iOS jangan mengubah nominal uang jadi tautan telepon
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

/**
 * iOS Safari otomatis zoom saat input dengan font < 16px diketuk (input di HP = 14px).
 * maximum-scale=1 mencegah auto-zoom itu; di iOS pinch-zoom tetap bisa karena Safari
 * mengabaikan maximum-scale untuk gestur pengguna. Hanya dipasang di iOS, karena di
 * Android maximum-scale ikut mematikan pinch-zoom.
 */
const IOS_VIEWPORT = `(function(){var n=navigator;if(!(/iPad|iPhone|iPod/.test(n.userAgent)||(n.platform==="MacIntel"&&n.maxTouchPoints>1)))return;function f(){var m=document.querySelector('meta[name=viewport]');if(m&&m.content.indexOf("maximum-scale")<0)m.content+=",maximum-scale=1";}f();document.addEventListener("DOMContentLoaded",f);})();`;

/**
 * Script di <head>: tangkap event "beforeinstallprompt" Chrome Android sedini mungkin.
 * Event ini bisa muncul sebelum React selesai dimuat, jadi disimpan di window untuk tombol Pasang
 * (InstallApp di components/pwa.tsx).
 */
const PWA_HEAD_SCRIPT = `(function(){window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__pawflowInstall=e;window.dispatchEvent(new Event("pawflow:installable"));});window.addEventListener("appinstalled",function(){window.__pawflowInstall=null;window.dispatchEvent(new Event("pawflow:installable"));});})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: IOS_VIEWPORT }} />
        <script dangerouslySetInnerHTML={{ __html: PWA_HEAD_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-center" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
