import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppContext } from '../types';
import { SESSION_COOKIE } from '@shared/constants';
import { hashSessionToken } from '@shared/password';
import { mapSessionUser, type DbUser } from '../db/mappers';

export async function authMiddleware(c: Context<AppContext>, next: Next) {
  c.set('user', null);
  c.set('sessionId', null);

  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    await next();
    return;
  }

  const tokenHash = await hashSessionToken(token);
  const session = await c.env.DB.prepare(
    `SELECT s.id, s.user_id, s.expires_at, s.revoked_at
     FROM sessions s
     WHERE s.token_hash = ?`,
  )
    .bind(tokenHash)
    .first<{ id: string; user_id: string; expires_at: string; revoked_at: string | null }>();

  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
    await next();
    return;
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(session.user_id)
    .first<DbUser>();

  if (!user || user.is_active !== 1) {
    await next();
    return;
  }

  c.set('user', mapSessionUser(user));
  c.set('sessionId', session.id);
  await next();
}

export function requireAuth(c: Context<AppContext>) {
  const user = c.get('user');
  if (!user) return null;
  return user;
}

export function requireAdmin(c: Context<AppContext>) {
  const user = requireAuth(c);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export function requireCs(c: Context<AppContext>) {
  const user = requireAuth(c);
  if (!user || user.role !== 'CS') return null;
  return user;
}

export function getClientIp(c: Context<AppContext>): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
