import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import type { AppContext } from '../types';
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MINUTES,
  SESSION_COOKIE,
  SESSION_HOURS,
} from '@shared/constants';
import { verifyPassword, hashSessionToken, generateSessionToken } from '@shared/password';
import { generateId } from '@shared/ids';
import { addHoursUtc, nowUtcIso } from '@shared/datetime';
import { mapUser, type DbUser, writeAuditLog } from '../db/mappers';
import { authMiddleware, getClientIp, requireAuth } from '../middleware/auth';

export const authRoutes = new Hono<AppContext>();

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

authRoutes.use('/*', authMiddleware);

async function countRecentAttempts(
  db: D1Database,
  username: string,
  ip: string,
): Promise<number> {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000).toISOString();
  const byUser = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM login_attempts
       WHERE username = ? COLLATE NOCASE AND attempted_at >= ?`,
    )
    .bind(username, windowStart)
    .first<{ count: number }>();
  const byIp = await db
    .prepare(`SELECT COUNT(*) AS count FROM login_attempts WHERE ip_address = ? AND attempted_at >= ?`)
    .bind(ip, windowStart)
    .first<{ count: number }>();
  return Math.max(byUser?.count ?? 0, byIp?.count ?? 0);
}

async function recordAttempt(db: D1Database, username: string, ip: string) {
  await db
    .prepare('INSERT INTO login_attempts (id, username, ip_address, attempted_at) VALUES (?, ?, ?, ?)')
    .bind(generateId('lga'), username, ip, nowUtcIso())
    .run();
}

authRoutes.post('/login', async (c) => {
  const body = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: 'Username atau password salah.' }, 400);
  }

  const { username, password } = body.data;
  const ip = getClientIp(c);

  const attempts = await countRecentAttempts(c.env.DB, username, ip);
  if (attempts >= LOGIN_MAX_ATTEMPTS) {
    return c.json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' }, 429);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
    .bind(username)
    .first<DbUser>();

  if (!user || user.is_active !== 1) {
    await recordAttempt(c.env.DB, username, ip);
    return c.json({ error: 'Username atau password salah.' }, 401);
  }

  const valid = await verifyPassword(
    password,
    user.password_hash,
    user.password_salt,
    user.password_iterations,
  );

  if (!valid) {
    await recordAttempt(c.env.DB, username, ip);
    return c.json({ error: 'Username atau password salah.' }, 401);
  }

  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  const sessionId = generateId('ses');
  const expiresAt = addHoursUtc(nowUtcIso(), SESSION_HOURS);

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    ).bind(sessionId, user.id, tokenHash, expiresAt),
    c.env.DB.prepare(`UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`).bind(
      nowUtcIso(),
      nowUtcIso(),
      user.id,
    ),
  ]);

  await writeAuditLog(c.env.DB, user.id, 'LOGIN', 'session', sessionId);

  const isSecure = c.env.APP_ENV !== 'development';
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });

  return c.json({ user: mapUser(user) });
});

authRoutes.post('/logout', async (c) => {
  const sessionId = c.get('sessionId');
  const user = requireAuth(c);
  if (sessionId) {
    await c.env.DB.prepare(`UPDATE sessions SET revoked_at = ? WHERE id = ?`)
      .bind(nowUtcIso(), sessionId)
      .run();
    if (user) {
      await writeAuditLog(c.env.DB, user.id, 'LOGOUT', 'session', sessionId);
    }
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

authRoutes.get('/session', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ user: null });
  const dbUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(user.id)
    .first<DbUser>();
  if (!dbUser) return c.json({ user: null });
  return c.json({ user: mapUser(dbUser) });
});
