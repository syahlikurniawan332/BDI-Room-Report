# Database BDI Cleaning Control

## Konsep utama

- Satu laporan hanya untuk satu area.
- Satu laporan mempunyai satu foto `BEFORE` aktif dan satu foto `AFTER` aktif.
- Satu area boleh dilaporkan berkali-kali pada hari yang sama melalui laporan berbeda.
- Semua CS dapat memilih semua area aktif.
- Nama dan email pada laporan merupakan snapshot profil CS ketika laporan dibuat.
- File foto tidak disimpan di database; database hanya menyimpan `r2_object_key`.
- Laporan dan pengaduan tidak dihapus ketika foto kedaluwarsa.

## Data bawaan

- 1 akun admin.
- 4 akun CS: Deddy Suganda, Feri Kurniawan, Jihan, dan Renaldi.
- 29 master area.
- 17 hari libur nasional dan 8 hari cuti bersama tahun 2026.
- 9 pengaturan aplikasi.

Email bawaan menggunakan domain `.invalid` agar tidak mengirim email ke alamat yang salah. Admin harus menggantinya dengan email asli sebelum produksi.

## Relasi ringkas

```text
users -> reports -> photos
                 -> reviews

areas -> reports
      -> complaints -> complaint_photos

users -> sessions
      -> notifications
      -> reminder_logs
      -> audit_logs
```

## Password

Database menyimpan password menggunakan PBKDF2-HMAC-SHA-256, salt unik, dan nilai iterasi pada setiap baris user. File `INITIAL_CREDENTIALS.local.txt` berisi password awal dan sengaja tercantum di `.gitignore`.

Admin boleh membuat atau mereset password melalui aplikasi, tetapi password lama tidak dapat dibaca dari database.

## Status laporan

```text
DRAFT
SUBMITTED
REVISION_REQUIRED
RESUBMITTED
APPROVED
REJECTED
```

## Status pengaduan

```text
NEW
IN_PROGRESS
RESOLVED
REJECTED
```

## Penghapusan foto

- Setelah laporan dikirim, aplikasi mengisi `expires_at` dengan `submitted_at + 90 hari`.
- Cron menghapus objek R2 yang telah kedaluwarsa dan mengisi `deleted_at`.
- Draft yang tidak berubah selama 14 hari dapat dibersihkan.
- Metadata laporan tetap tersedia untuk audit.
