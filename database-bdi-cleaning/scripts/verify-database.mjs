import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, timingSafeEqual } from 'node:crypto';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const databasePath = resolve(process.env.DB_PATH ?? join(projectRoot, 'cleaning-control.sqlite'));
const credentialsPath = resolve(
  process.env.CREDENTIALS_PATH ?? join(projectRoot, 'INITIAL_CREDENTIALS.local.txt'),
);

const database = new DatabaseSync(databasePath, { readOnly: true });

function scalar(sql) {
  return database.prepare(sql).get();
}

const expectedCounts = {
  users: 5,
  areas: 29,
  holidays: 25,
  app_settings: 9,
  reports: 0,
  complaints: 0,
};

for (const [table, expected] of Object.entries(expectedCounts)) {
  const row = scalar(`SELECT COUNT(*) AS count FROM ${table}`);
  if (row.count !== expected) {
    throw new Error(`Jumlah ${table} salah: ${row.count}; seharusnya ${expected}`);
  }
}

const integrity = scalar('PRAGMA integrity_check;');
if (integrity.integrity_check !== 'ok') {
  throw new Error(`Integrity check gagal: ${integrity.integrity_check}`);
}

const foreignKeyProblems = database.prepare('PRAGMA foreign_key_check;').all();
if (foreignKeyProblems.length > 0) {
  throw new Error(`Foreign key check gagal: ${JSON.stringify(foreignKeyProblems)}`);
}

const credentialsText = readFileSync(credentialsPath, 'utf8');
const usernameMatches = [...credentialsText.matchAll(/^Username : (.+)$/gm)];
const passwordMatches = [...credentialsText.matchAll(/^Password : (.+)$/gm)];

if (usernameMatches.length !== 5 || passwordMatches.length !== 5) {
  throw new Error('Format file kredensial tidak sesuai.');
}

for (let index = 0; index < usernameMatches.length; index += 1) {
  const username = usernameMatches[index][1].trim();
  const password = passwordMatches[index][1].trim();
  const user = database
    .prepare(
      `SELECT password_hash, password_salt, password_iterations
       FROM users
       WHERE username = ? COLLATE NOCASE`,
    )
    .get(username);

  if (!user) {
    throw new Error(`User tidak ditemukan: ${username}`);
  }

  const calculated = pbkdf2Sync(
    password,
    Buffer.from(user.password_salt, 'base64'),
    user.password_iterations,
    32,
    'sha256',
  );
  const stored = Buffer.from(user.password_hash, 'base64');

  if (stored.length !== calculated.length || !timingSafeEqual(stored, calculated)) {
    throw new Error(`Verifikasi password gagal: ${username}`);
  }
}

database.close();

console.log('Database valid.');
console.log('5 pengguna, 29 area, 25 tanggal libur/cuti, dan 9 pengaturan tersedia.');
console.log('Seluruh password awal berhasil diverifikasi terhadap hash database.');
