import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { nowUtcIso } from '@shared/datetime';
import { writeAuditLog } from '../db/mappers';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const settingsRoutes = new Hono<AppContext>();

const updateSettingSchema = z.object({
  settingValue: z.string().min(1).max(500),
});

settingsRoutes.get('/', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const rows = await c.env.DB.prepare('SELECT * FROM app_settings ORDER BY setting_key ASC').all();
  return c.json({
    settings: (rows.results ?? []).map((s) => ({
      settingKey: s.setting_key,
      settingValue: s.setting_value,
      description: s.description,
    })),
  });
});

settingsRoutes.patch('/:key', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = updateSettingSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const key = c.req.param('key');
  const existing = await c.env.DB.prepare('SELECT setting_key FROM app_settings WHERE setting_key = ?')
    .bind(key)
    .first();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  await c.env.DB.prepare(
    `UPDATE app_settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?`,
  )
    .bind(parsed.data.settingValue, nowUtcIso(), key)
    .run();

  await writeAuditLog(c.env.DB, admin.id, 'UPDATE_SETTING', 'app_settings', key, {
    settingValue: parsed.data.settingValue,
  });

  return c.json({ ok: true });
});
