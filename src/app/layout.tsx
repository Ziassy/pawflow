import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: IOS_VIEWPORT }} />
      </head>
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
