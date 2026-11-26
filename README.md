# PawFlow

> Track your spending, find your flow.


Aplikasi web pengganti Google Spreadsheet: gaji, pengeluaran, hutang, piutang,
investasi, aset, dan target keuangan (FIRE). Bahasa Indonesia, Rupiah tanpa desimal.
Mendukung beberapa akun; tiap akun punya data keuangan sendiri (lihat **Akun** di bawah).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) ·
Prisma 7 (SQLite lokal / PostgreSQL produksi) · Zod · React Hook Form · Recharts · Vitest.

## Prinsip data

- Nominal disimpan sebagai **integer Rupiah**. Target besar (≥ 2,1 M) memakai `BigInt`.
- **Tidak ada total yang disimpan.** Semua total, sisa, dan persentase dihitung dari baris transaksi
  (`src/lib/money.ts`, `debt.ts`, `investment.ts`, `fire.ts`, `dashboard.ts`).
- Satu bulan (`YYYY-MM`) hanya ada satu. Transaksi tanpa nominal → bulan “Tidak lengkap”.
- Pemasukan selain gaji = kategori **Pemasukan**, menambah sisa.
- Profit investasi = (Nilai akhir − Modal) / Modal; modal 0 atau nilai kosong → “–”.

## Menjalankan lokal

```bash
cp .env.example .env        # isi APP_PASSWORD dan SESSION_SECRET (openssl rand -hex 32)
npm install
npm run db:migrate          # buat tabel di dev.db
npm run db:seed             # akun admin + kategori, template, jenis aset, platform (aman diulang)
npm run dev                 # http://localhost:3000
```

Masuk pertama kali dengan username `admin` dan password = `APP_PASSWORD`. Password itu lalu disimpan
sebagai milik akun admin; ganti di **Pengaturan → Akun saya**.

Buka dari HP di jaringan yang sama: `npm run dev -- -H 0.0.0.0`, lalu akses `http://<IP-laptop>:3000`.
Di HP bisa “Tambahkan ke Layar Utama” (PWA) agar tampil seperti aplikasi.

> Jika `npm install` gagal dengan `EALLOWSCRIPTS`, hapus baris `allow-scripts=...` di `~/.npmrc`.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` / `build` / `start` | pengembangan / build produksi / jalankan build |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint · TypeScript · unit test (Vitest) |
| `npm run db:migrate` · `db:deploy` · `db:seed` · `db:studio` | migrasi dev · migrasi produksi · data awal · lihat DB |
| `npm run import` | import CSV dari folder `data/` ke akun admin; `-- --user nama` untuk akun lain |
| `npm run db:use-postgres` · `db:use-sqlite` | ganti database SQLite ⇄ PostgreSQL |

## Import data spreadsheet lama

Taruh CSV di `data/` lalu jalankan:

```bash
npm run import -- --dry-run   # simulasi + laporan, tidak menyimpan
npm run import                # simpan
```

Import dijalankan sekali dari laptop (tidak ada upload CSV di aplikasi, agar server tetap ringan).

| File | Isi |
| --- | --- |
| `transaksi.csv` | Bulan, Nama, Kategori, Jumlah (Rp), Status, Koreksi |
| `ringkasan_bulanan.csv` | Bulan, Status, Gaji, Pemasukan, Kebutuhan, … — bulan tanpa rincian jadi transaksi ringkasan per kategori, dan dipakai untuk **verifikasi total** |
| `riwayat_gaji.csv` | Bulan, Gaji, Pengeluaran tercatat |
| `asset_tracker.csv` | baris = jenis aset, kolom = bulan |
| `hutang.csv` | baris = kartu, kolom = bulan |
| `*investasi*.csv` | sheet Investasi lama: investasi, piutang, target portofolio, aset fisik, target, resolusi |

Format angka `14,200,000`, `14.200.000`, `(99,170)` = negatif, `-` = nol, sel kosong = tidak ada data.
Import **idempotent**: aman diulang, tidak menggandakan data, dan (tanpa `--force`) tidak menimpa
perubahan yang dibuat di aplikasi. Baris gagal dilaporkan dengan nama file + nomor baris.

## Piutang

Dua jenis:
- **Bayar bebas** — sekali bayar atau nyicil kapan saja. Dicatat seperti mutasi rekening (debit/kredit):
  pinjam 1 jt → bayar 100 rb → bayar 200 rb → pinjam lagi 500 rb = sisa 1,2 jt. Setiap pembayaran bisa otomatis
  jadi transaksi **Pemasukan** di bulannya.
- **Cicilan tetap** — jadwal bulanan dengan nominal sama; centang lunas per cicilan.

## Akun

- Akun dibuat oleh **admin** di **Pengaturan → Kelola akun** (tidak ada pendaftaran publik). Admin juga bisa
  mereset password, menjadikan/mencabut admin, dan menghapus akun (beserta seluruh datanya, wajib ketik username).
- **Data terpisah per akun.** Semua tabel keuangan punya kolom `userId`. `src/lib/db.ts` menambahkan
  filter akun ke setiap query secara otomatis dan memeriksa bahwa setiap foreign key (kategori, bulan, hutang, …)
  milik akun yang sama, jadi id yang ditebak tidak bisa membaca atau mengubah data akun lain.
  Tabel baru wajib punya `userId` dan didaftarkan di `src/lib/tenancy.ts`; `tenancy.test.ts` gagal jika lupa.
- Akun baru mulai dengan kategori, template, jenis aset, dan platform bawaan.
- Ganti password atau reset oleh admin langsung mengeluarkan perangkat lain akun itu.
- Data lama dari versi satu pengguna otomatis menjadi milik akun `admin` saat migrasi.

## Backup & pulihkan

**Pengaturan → Backup & pulihkan.** “Unduh backup” menghasilkan satu file JSON berisi semua data **akun yang sedang masuk**.
“Pulihkan” mengganti seluruh data akun itu dengan isi file (satu transaksi: jika gagal, tidak ada yang berubah;
wajib ketik `PULIHKAN`); data akun lain tidak tersentuh. Id dibuat ulang saat pulihkan, jadi file dari akun lain
atau dari versi satu pengguna bisa dipulihkan ke akun mana pun. Format sama untuk SQLite dan PostgreSQL,
jadi dipakai juga untuk pindah server.

## Deploy ke Vercel + Neon

1. **Buat database di [Neon](https://neon.tech).** Salin connection string *pooled*:
   `postgresql://USER:PASS@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require`
2. **Ganti proyek ke PostgreSQL** (sekali saja, lalu commit):
   ```bash
   npm run db:use-postgres
   ```
   Ini mengubah `provider` di `prisma/schema.prisma`, mengarsipkan migrasi SQLite ke
   `prisma/migrations-sqlite`, dan membuat `prisma/migrations/0_init` untuk PostgreSQL.
3. **Siapkan isi database Neon** dari laptop:
   ```bash
   DATABASE_URL="postgresql://…neon…" npm run db:deploy
   DATABASE_URL="postgresql://…neon…" npm run db:seed
   ```
4. **Push ke GitHub, import proyek di [Vercel](https://vercel.com/new).** Isi Environment Variables:
   | Nama | Nilai |
   | --- | --- |
   | `DATABASE_URL` | connection string Neon |
   | `APP_PASSWORD` | password login (kuat) |
   | `SESSION_SECRET` | `openssl rand -hex 32` |

   Vercel otomatis memakai script `vercel-build` (`prisma generate && prisma migrate deploy && next build`),
   jadi migrasi baru ikut terpasang setiap deploy.
5. **Pindahkan data lama:** di app lokal (SQLite) → Pengaturan → *Unduh backup*. Di app Vercel →
   Pengaturan → *Pulihkan* → pilih file tadi → ketik `PULIHKAN`.

Kembali ke SQLite lokal: `npm run db:use-sqlite` dan `DATABASE_URL="file:./dev.db"`.

## Keamanan

- **Login per akun**: username + password (hash scrypt per akun). Sesi = cookie httpOnly bertanda tangan
  HMAC (`SESSION_SECRET`) berisi id akun dan versi sesi, 30 hari, `SameSite=Lax`; di HTTPS memakai nama `__Host-…`
  (wajib Secure, tidak bisa ditimpa subdomain). Server mencocokkan versi sesi dengan database di setiap request.
- **`APP_PASSWORD` hanya untuk login pertama akun admin hasil migrasi/seed.** Di produksi, jika masih default
  atau < 6 karakter, login pertama itu dinonaktifkan.
- **Anti brute force**: 5 salah / 15 menit per IP → dikunci 15 menit (berlipat sampai 24 jam); 30 salah / 15 menit
  dari semua IP → login dikunci sementara. Saat terkunci, password tidak diperiksa sama sekali.
- **Setiap halaman & server action diperiksa** (proxy + `requireAuth`); server action juga dilindungi CSRF oleh Next.js (cek Origin).
- **Redirect setelah login hanya ke path internal** (`//`, `/\`, URL absolut ditolak).
- **Pesan error database tidak dikirim ke browser** (dicatat di log server saja).
- **Header keamanan**: anti-clickjacking (`X-Frame-Options: DENY`, `frame-ancestors 'none'`), `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS, `noindex`; header `X-Powered-By` dimatikan.
- Upload backup dibatasi 4 MB dan divalidasi; pulihkan berjalan dalam satu transaksi.

**Wajib sebelum online:** ganti `APP_PASSWORD` (≥ 6 karakter, bukan password default) dan isi `SESSION_SECRET` acak (`openssl rand -hex 32`).
**Keluar dari satu akun di semua perangkat:** ganti password akun itu (atau admin mereset-nya).
**Keluar dari semua perangkat:** ganti `SESSION_SECRET` lalu deploy ulang — semua sesi lama langsung tidak berlaku.
File backup JSON berisi seluruh data keuangan: simpan di tempat aman. Jangan commit `.env`, `*.db`, atau `data/*.csv`
(sudah di `.gitignore`).

## Struktur singkat

```
src/app/(app)/        halaman: dashboard, bulanan, transaksi, ringkasan, hutang, investasi, target, pengaturan
src/components/       UI bersama (dropdown, date picker, dialog, disclosure, grafik, input Rupiah)
src/lib/              logika murni + unit test (uang, hutang, investasi, FIRE, import, backup)
src/server/           server action, query, backup
scripts/import*.ts    import CSV (CLI, tidak dibawa ke server)
scripts/              ganti database, data demo
prisma/               skema, migrasi, seed
```
