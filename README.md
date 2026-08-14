# BDI Medan Cleaning Control

Aplikasi web pelaporan kebersihan untuk Balai Diklat Industri Medan.

## Stack

- Vue 3 + Vite + Pinia + Vue Router + Tailwind CSS
- Hono API on Cloudflare Workers
- Cloudflare D1 (SQLite) + R2 (foto)
- Dexie.js (draft lokal IndexedDB)
- Vitest + Playwright

## Persiapan

```bash
npm install
node database-bdi-cleaning/scripts/init-database.mjs
```

Kredensial awal ada di `database-bdi-cleaning/INITIAL_CREDENTIALS.local.txt` (gitignored).

## Pengembangan Lokal

```bash
# Terapkan migration D1 lokal + seed
npm run db:migrate:local
npm run db:seed:local
# Seed user (file lokal hasil init-database)
npx wrangler d1 execute bdi-cleaning-control --local --file=database-bdi-cleaning/seeds/generated-users.local.sql

# Jalankan dev server (Vite + Worker)
npm run dev
```

Salin `.dev.vars.example` ke `.dev.vars` dan isi secret produksi/staging.

## Scripts

| Script | Keterangan |
|--------|------------|
| `npm run dev` | Dev server |
| `npm run build` | Build frontend |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run cf:deploy` | Build + deploy Workers |

## Struktur

```text
database-bdi-cleaning/   # Migration, seed, schema (kontrak DB)
src/worker/              # Hono API + cron
src/client/              # Vue frontend
src/shared/              # Utilitas bersama
tests/                   # Vitest
e2e/                     # Playwright
```

## Fitur

- Login username/password (session cookie 12 jam)
- CS: draft lokal IndexedDB, laporan before/after, submit dengan idempotency key
- Admin: review laporan, kelola user/area/libur, pengaduan, unduh ZIP
- Publik: pengaduan anonim + Turnstile + foto opsional
- Cron: hapus foto expired, reminder CS tidak aktif 3 hari kerja

## Deploy Cloudflare

1. Buat D1 database dan R2 bucket
2. Update `wrangler.jsonc` (`database_id`, bindings)
3. Set secrets: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY`, `ADMIN_NOTIFICATION_EMAIL`
4. `npm run db:migrate:local` → `--remote` untuk produksi
5. `npm run cf:deploy`
