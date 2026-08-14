import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { generateId, slugify } from '@shared/ids';
import { nowUtcIso } from '@shared/datetime';
import { mapArea, type DbArea, writeAuditLog } from '../db/mappers';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const areaRoutes = new Hono<AppContext>();

const createAreaSchema = z.object({
  name: z.string().min(2).max(200),
  displayOrder: z.number().int().min(0).optional(),
});

const updateAreaSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

areaRoutes.get('/', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const activeOnly = user.role === 'CS' || c.req.query('active') === '1';
  const rows = await c.env.DB.prepare('SELECT * FROM areas ORDER BY display_order ASC').all<DbArea>();

  const areas = (rows.results ?? [])
    .map((row) => mapArea(row, !activeOnly))
    .filter(Boolean);

  return c.json({ areas });
});

areaRoutes.get('/public', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM areas WHERE is_active = 1 ORDER BY display_order ASC',
  ).all<DbArea>();
  return c.json({ areas: (rows.results ?? []).map((r) => mapArea(r, false)).filter(Boolean) });
});

areaRoutes.post('/', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = createAreaSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const maxOrder = await c.env.DB.prepare('SELECT MAX(display_order) AS max_order FROM areas').first<{
    max_order: number | null;
  }>();
  const displayOrder = parsed.data.displayOrder ?? (maxOrder?.max_order ?? 0) + 1;
  const id = generateId('area');
  const slug = slugify(parsed.data.name);
  const now = nowUtcIso();

  try {
    await c.env.DB.prepare(
      `INSERT INTO areas (id, name, slug, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
    )
      .bind(id, parsed.data.name, slug, displayOrder, now, now)
      .run();
  } catch {
    return c.json({ error: 'Nama area sudah ada.' }, 409);
  }

  await writeAuditLog(c.env.DB, admin.id, 'CREATE_AREA', 'area', id);
  const area = await c.env.DB.prepare('SELECT * FROM areas WHERE id = ?').bind(id).first<DbArea>();
  return c.json({ area: mapArea(area!) }, 201);
});

areaRoutes.patch('/:id', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = updateAreaSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const areaId = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM areas WHERE id = ?').bind(areaId).first<DbArea>();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const updates: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.name) {
    updates.push('name = ?', 'slug = ?');
    values.push(parsed.data.name, slugify(parsed.data.name));
  }
  if (parsed.data.displayOrder !== undefined) {
    updates.push('display_order = ?');
    values.push(parsed.data.displayOrder);
  }
  if (parsed.data.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(parsed.data.isActive ? 1 : 0);
  }

  if (updates.length === 0) return c.json({ error: 'No changes' }, 400);

  updates.push('updated_at = ?');
  values.push(nowUtcIso());
  values.push(areaId);

  try {
    await c.env.DB.prepare(`UPDATE areas SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  } catch {
    return c.json({ error: 'Nama area sudah ada.' }, 409);
  }

  await writeAuditLog(c.env.DB, admin.id, 'UPDATE_AREA', 'area', areaId, parsed.data);
  const area = await c.env.DB.prepare('SELECT * FROM areas WHERE id = ?').bind(areaId).first<DbArea>();
  return c.json({ area: mapArea(area!) });
});
