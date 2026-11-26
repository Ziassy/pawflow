import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { COLOR_THEME_COOKIE, colorThemeStyleObj, colorThemeDarkScript } from "@/lib/color-themes";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
};

/**
 * iOS Safari otomatis zoom saat input dengan font < 16px diketuk (input di HP = 14px).
 * maximum-scale=1 mencegah auto-zoom itu; di iOS pinch-zoom tetap bisa karena Safari
 * mengabaikan maximum-scale untuk gestur pengguna. Hanya dipasang di iOS, karena di
 * Android maximum-scale ikut mematikan pinch-zoom.
 */
const IOS_VIEWPORT = `(function(){var n=navigator;if(!(/iPad|iPhone|iPod/.test(n.userAgent)||(n.platform==="MacIntel"&&n.maxTouchPoints>1)))return;function f(){var m=document.querySelector('meta[name=viewport]');if(m&&m.content.indexOf("maximum-scale")<0)m.content+=",maximum-scale=1";}f();document.addEventListener("DOMContentLoaded",f);})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const colorId = jar.get(COLOR_THEME_COOKIE)?.value;

  // Light theme CSS vars sebagai atribut style di <html>.
  // suppressHydrationWarning mencegah React complain kalau ekstensi mengubah atribut.
  const themeStyle = colorThemeStyleObj(colorId);

  // Script dark-mode reactivity + iOS viewport masuk di awal <body>,
  // bukan di <head>, agar ekstensi browser yang menyisipkan elemen ke <head>
  // tidak menggeser posisi elemen kita dan menyebabkan hydration mismatch.
  const darkScript = colorThemeDarkScript(colorId);

  return (
    <html
      lang="id"
      className={`${inter.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
      style={themeStyle}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        {/* Blocking scripts di awal body: dark mode reactivity + iOS viewport fix */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: darkScript }} />
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: IOS_VIEWPORT }} />
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
