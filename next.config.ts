import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Mode dev: izinkan dibuka dari HP di jaringan yang sama (mis. http://192.168.1.9:3000).
// Tanpa ini Next memblokir JavaScript dev untuk alamat selain localhost -> tombol tidak bisa diklik.
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

// Header keamanan untuk semua halaman.
const securityHeaders = [
  // Cegah halaman dimasukkan ke iframe situs lain (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Browser hanya akan memakai HTTPS untuk domain ini (diabaikan di http://localhost)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...lanHosts, "*.local"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // App pribadi berbasis DB: semua halaman dinamis, tanpa cacheComponents.
  serverExternalPackages: ["better-sqlite3"],
  // Upload backup/CSV lewat server action (batas Vercel 4,5 MB)
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
