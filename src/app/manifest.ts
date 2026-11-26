import type { MetadataRoute } from "next";

// Manifest PWA: bisa dipasang di Android (Chrome) dan iOS (Safari > Tambah ke Layar Utama).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PawFlow",
    short_name: "PawFlow",
    description: "Track your spending, find your flow.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f8ff",
    theme_color: "#2563eb",
    lang: "id",
    categories: ["finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Latar penuh agar launcher Android bisa memotong jadi lingkaran/squircle
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
