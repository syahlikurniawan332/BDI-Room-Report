import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { hashPassword } from '@shared/password';
import { generateId, generateTemporaryPassword } from '@shared/ids';
import { nowUtcIso } from '@shared/datetime';
import { mapUser, type DbUser, writeAuditLog } from '../db/mappers';
import { requireAdmin } from '../middleware/auth';

export const userRoutes = new Hono<AppContext>();

const createUserSchema = z.object({
  displayName: z.string().min(2).max(200),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().email().max(200),
  role: z.enum(['ADMIN', 'CS']),
  password: z.string().min(8).max(200).optional(),
  generatePassword: z.boolean().optional(),
});

const updateUserSchema = z.object({
  displayName: z.string().min(2).max(200).optional(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  email: z.string().email().max(200).optional(),
  isActive: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).max(200).optional(),
  generatePassword: z.boolean().optional(),
});

userRoutes.get('/', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const rows = await c.env.DB.prepare(
    'SELECT * FROM users ORDER BY role ASC, display_name ASC',
  ).all<DbUser>();

  return c.json({ users: (rows.results ?? []).map(mapUser) });
});

userRoutes.post('/', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = createUserSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);

  const { displayName, username, email, role } = parsed.data;
  let plainPassword = parsed.data.password;
  if (parsed.data.generatePassword || !plainPassword) {
    plainPassword = generateTemporaryPassword();
  }

  const existing = await c.env.DB.prepare(
    `SELECT id FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE`,
  )
    .bind(username, email)
    .first();
  if (existing) return c.json({ error: 'Username atau email sudah digunakan.' }, 409);

  const pw = await hashPassword(plainPassword);
  const id = generateId('usr');
  const now = nowUtcIso();

  await c.env.DB.prepare(
    `INSERT INTO users (id, username, display_name, email, password_hash, password_salt, password_iterations, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  )
    .bind(
      id,
      username,
      displayName,
      email,
      pw.passwordHash,
      pw.passwordSalt,
      pw.passwordIterations,
      role,
      now,
      now,
    )
    .run();

  await writeAuditLog(c.env.DB, admin.id, 'CREATE_USER', 'user', id, { username, role });

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DbUser>();
  return c.json({ user: mapUser(user!), temporaryPassword: plainPassword }, 201);
});

userRoutes.patch('/:id', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = updateUserSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const userId = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<DbUser>();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  if (userId === admin.id && parsed.data.isActive === false) {
    return c.json({ error: 'Akun yang sedang digunakan tidak dapat dinonaktifkan.' }, 400);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.displayName) {
    updates.push('display_name = ?');
    values.push(parsed.data.displayName);
  }
  if (parsed.data.username) {
    const dup = await c.env.DB.prepare(
      `SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?`,
    )
      .bind(parsed.data.username, userId)
      .first();
    if (dup) return c.json({ error: 'Username sudah digunakan.' }, 409);
    updates.push('username = ?');
    values.push(parsed.data.username);
  }
  if (parsed.data.email) {
    const dup = await c.env.DB.prepare(
      `SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?`,
    )
      .bind(parsed.data.email, userId)
      .first();
    if (dup) return c.json({ error: 'Email sudah digunakan.' }, 409);
    updates.push('email = ?');
    values.push(parsed.data.email);
  }
  if (parsed.data.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(parsed.data.isActive ? 1 : 0);
  }

  if (updates.length === 0) return c.json({ error: 'No changes' }, 400);

  updates.push('updated_at = ?');
  values.push(nowUtcIso());
  values.push(userId);

  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  await writeAuditLog(c.env.DB, admin.id, 'UPDATE_USER', 'user', userId, parsed.data);

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<DbUser>();
  return c.json({ user: mapUser(user!) });
});

userRoutes.post('/:id/reset-password', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = resetPasswordSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const userId = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  let plainPassword = parsed.data.password;
  if (parsed.data.generatePassword || !plainPassword) {
    plainPassword = generateTemporaryPassword();
  }

  const pw = await hashPassword(plainPassword);
  await c.env.DB.prepare(
    `UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(pw.passwordHash, pw.passwordSalt, pw.passwordIterations, nowUtcIso(), userId)
    .run();

  await writeAuditLog(c.env.DB, admin.id, 'RESET_PASSWORD', 'user', userId);

  return c.json({ ok: true, temporaryPassword: plainPassword });
});

userRoutes.post('/:id/revoke-sessions', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const userId = c.req.param('id');
  await c.env.DB.prepare(`UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`)
    .bind(nowUtcIso(), userId)
    .run();

  await writeAuditLog(c.env.DB, admin.id, 'REVOKE_SESSIONS', 'user', userId);
  return c.json({ ok: true });
});

userRoutes.get('/:id/reports', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const userId = c.req.param('id');
  const rows = await c.env.DB.prepare(
    `SELECT r.*, a.name AS area_name FROM reports r
     JOIN areas a ON a.id = r.area_id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC LIMIT 100`,
  )
    .bind(userId)
    .all();

  return c.json({ reports: rows.results ?? [] });
});
