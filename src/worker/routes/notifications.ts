import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { nowUtcIso } from '@shared/datetime';
import { requireAuth } from '../middleware/auth';

export const notificationRoutes = new Hono<AppContext>();

function mapNotification(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    notificationType: row.notification_type as string,
    title: row.title as string,
    message: row.message as string,
    relatedEntityType: (row.related_entity_type as string | null) ?? null,
    relatedEntityId: (row.related_entity_id as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

notificationRoutes.get('/', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const unreadOnly = c.req.query('unread') === '1';
  let sql = `SELECT * FROM notifications WHERE user_id = ?`;
  if (unreadOnly) sql += ' AND read_at IS NULL';
  sql += ' ORDER BY created_at DESC LIMIT 100';

  const rows = await c.env.DB.prepare(sql).bind(user.id).all();
  return c.json({
    notifications: (rows.results ?? []).map((r) => mapNotification(r as Record<string, unknown>)),
  });
});

notificationRoutes.get('/unread-count', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const row = await c.env.DB.prepare(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL`,
  )
    .bind(user.id)
    .first<{ count: number }>();

  return c.json({ count: row?.count ?? 0 });
});

const markReadSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  all: z.boolean().optional(),
});

notificationRoutes.post('/mark-read', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const parsed = markReadSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const now = nowUtcIso();

  if (parsed.data.all) {
    await c.env.DB.prepare(
      `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`,
    )
      .bind(now, user.id)
      .run();
  } else if (parsed.data.ids?.length) {
    const placeholders = parsed.data.ids.map(() => '?').join(', ');
    await c.env.DB.prepare(
      `UPDATE notifications SET read_at = ? WHERE user_id = ? AND id IN (${placeholders}) AND read_at IS NULL`,
    )
      .bind(now, user.id, ...parsed.data.ids)
      .run();
  } else {
    return c.json({ error: 'Tidak ada notifikasi yang dipilih.' }, 400);
  }

  return c.json({ ok: true });
});
