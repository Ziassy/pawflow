import type { MetadataRoute } from "next";

// Bisa "Tambahkan ke Layar Utama" di HP, tampil seperti aplikasi.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PawFlow",
    short_name: "PawFlow",
    description: "Track your spending, find your flow.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f8ff",
    theme_color: "#2563eb",
    lang: "id",
    icons: [
      { src: "/logo-mark.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
