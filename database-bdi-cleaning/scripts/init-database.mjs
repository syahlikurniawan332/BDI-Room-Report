import { DatabaseSync } from 'node:sqlite';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const outputDir = resolve(process.env.OUTPUT_DIR ?? projectRoot);
const databasePath = resolve(process.env.DB_PATH ?? join(outputDir, 'cleaning-control.sqlite'));
const credentialsPath = join(outputDir, 'INITIAL_CREDENTIALS.local.txt');
const generatedUsersSqlPath = join(outputDir, 'seeds', 'generated-users.local.sql');

const iterations = 310_000;
const users = [
  {
    id: 'usr_admin',
    username: 'admin',
    displayName: 'Administrator BDI Medan',
    email: 'admin@bdi-medan.invalid',
    role: 'ADMIN',
  },
  {
    id: 'usr_deddy',
    username: 'deddy',
    displayName: 'Deddy Suganda',
    email: 'deddy@bdi-medan.invalid',
    role: 'CS',
  },
  {
    id: 'usr_feri',
    username: 'feri',
    displayName: 'Feri Kurniawan',
    email: 'feri@bdi-medan.invalid',
    role: 'CS',
  },
  {
    id: 'usr_jihan',
    username: 'jihan',
    displayName: 'Jihan',
    email: 'jihan@bdi-medan.invalid',
    role: 'CS',
  },
  {
    id: 'usr_renaldi',
    username: 'renaldi',
    displayName: 'Renaldi',
    email: 'renaldi@bdi-medan.invalid',
    role: 'CS',
  },
];

function createTemporaryPassword() {
  return `${randomBytes(12).toString('base64url')}!9aA`;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function passwordRecord(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return {
    passwordHash: hash.toString('base64'),
    passwordSalt: salt.toString('base64'),
  };
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, 'seeds'), { recursive: true });

if (existsSync(databasePath)) {
  rmSync(databasePath);
}

const database = new DatabaseSync(databasePath);
database.exec('PRAGMA foreign_keys = ON;');
database.exec(readFileSync(join(projectRoot, 'migrations', '0001_initial_schema.sql'), 'utf8'));
database.exec(readFileSync(join(projectRoot, 'seeds', 'areas.sql'), 'utf8'));
database.exec(readFileSync(join(projectRoot, 'seeds', 'holidays_2026.sql'), 'utf8'));
database.exec(readFileSync(join(projectRoot, 'seeds', 'settings.sql'), 'utf8'));

const insertUser = database.prepare(`
  INSERT INTO users (
    id,
    username,
    display_name,
    email,
    password_hash,
    password_salt,
    password_iterations,
    role,
    is_active
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
`);

const credentialLines = [
  'KREDENSIAL AWAL - DATABASE BDI CLEANING',
  '========================================',
  '',
  'Rahasia. Jangan dimasukkan ke GitHub atau dikirim ke pihak luar.',
  'Email masih placeholder .invalid dan harus diganti admin sebelum produksi.',
  'Password berikut hanya ditampilkan di file ini; database menyimpan hash.',
  '',
];

const generatedSqlLines = [
  '-- DIHASILKAN OTOMATIS. JANGAN COMMIT FILE INI KE GITHUB.',
  '-- Terapkan ke D1 setelah migration dan seed master dijalankan.',
  '',
];

for (const user of users) {
  const temporaryPassword = createTemporaryPassword();
  const { passwordHash, passwordSalt } = passwordRecord(temporaryPassword);

  insertUser.run(
    user.id,
    user.username,
    user.displayName,
    user.email,
    passwordHash,
    passwordSalt,
    iterations,
    user.role,
  );

  credentialLines.push(
    `Nama     : ${user.displayName}`,
    `Username : ${user.username}`,
    `Email    : ${user.email}`,
    `Role     : ${user.role}`,
    `Password : ${temporaryPassword}`,
    '',
  );

  generatedSqlLines.push(
    'INSERT INTO users (id, username, display_name, email, password_hash, password_salt, password_iterations, role, is_active) VALUES (' +
      [
        user.id,
        user.username,
        user.displayName,
        user.email,
        passwordHash,
        passwordSalt,
        iterations,
        user.role,
        1,
      ]
        .map((value) => (typeof value === 'number' ? String(value) : sqlString(value)))
        .join(', ') +
      ');',
  );
}

database.close();

writeFileSync(credentialsPath, `${credentialLines.join('\n')}\n`, { mode: 0o600 });
writeFileSync(generatedUsersSqlPath, `${generatedSqlLines.join('\n')}\n`, { mode: 0o600 });

console.log(`Database dibuat: ${databasePath}`);
console.log(`Kredensial awal: ${credentialsPath}`);
console.log(`Seed user D1: ${generatedUsersSqlPath}`);
