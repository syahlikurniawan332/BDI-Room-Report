# Database Siap Pakai — BDI Medan Cleaning Control

Paket ini menyediakan schema Cloudflare D1/SQLite, migration, seed master, database lokal yang sudah terisi, dan kredensial sementara.

## Isi paket

```text
migrations/0001_initial_schema.sql
seeds/areas.sql
seeds/holidays_2026.sql
seeds/settings.sql
seeds/generated-users.local.sql
scripts/init-database.mjs
scripts/verify-database.mjs
docs/DATABASE.md
cleaning-control.sqlite
INITIAL_CREDENTIALS.local.txt
wrangler.example.jsonc
```

## Langsung menggunakan database lokal

1. Buka `INITIAL_CREDENTIALS.local.txt` untuk akun awal.
2. Gunakan `cleaning-control.sqlite` sebagai database pengembangan.
3. Ganti semua email dengan domain `.invalid` melalui aplikasi admin atau query database.

## Membuat ulang database

Memerlukan Node.js 22.5 atau lebih baru karena menggunakan modul bawaan `node:sqlite`.

```bash
node scripts/init-database.mjs
node scripts/verify-database.mjs
```

Setiap database baru mendapatkan password sementara yang berbeda.

## Menerapkan ke Cloudflare D1

Setelah membuat D1 dan mengatur `wrangler.jsonc`:

```bash
npx wrangler d1 migrations apply bdi-cleaning-control --local
npx wrangler d1 execute bdi-cleaning-control --local --file=seeds/areas.sql
npx wrangler d1 execute bdi-cleaning-control --local --file=seeds/holidays_2026.sql
npx wrangler d1 execute bdi-cleaning-control --local --file=seeds/settings.sql
npx wrangler d1 execute bdi-cleaning-control --local --file=seeds/generated-users.local.sql
```

Ganti `--local` menjadi `--remote` setelah staging berhasil diuji.

## Catatan GitHub

Commit migration, seed master, script, dokumentasi, `.gitignore`, dan contoh konfigurasi. Jangan commit:

- `cleaning-control.sqlite`
- `INITIAL_CREDENTIALS.local.txt`
- `seeds/generated-users.local.sql`
- `.env` atau `.dev.vars`
- foto dan backup produksi

## Data transaksi

Tabel laporan, foto, review, notifikasi, pengaduan, dan audit sengaja kosong. Database siap produksi tanpa data transaksi palsu.
