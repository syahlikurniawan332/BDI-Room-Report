import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { nowUtcIso } from '@shared/datetime';
import { writeAuditLog } from '../db/mappers';
import { requireAdmin } from '../middleware/auth';

export const holidayRoutes = new Hono<AppContext>();

const createHolidaySchema = z.object({
  holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(2).max(200),
  holidayType: z.enum(['NATIONAL', 'COLLECTIVE_LEAVE', 'INTERNAL']),
  source: z.string().max(200).optional(),
});

const updateHolidaySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  holidayType: z.enum(['NATIONAL', 'COLLECTIVE_LEAVE', 'INTERNAL']).optional(),
  isActive: z.boolean().optional(),
  source: z.string().max(200).optional(),
});

holidayRoutes.get('/', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const rows = await c.env.DB.prepare(
    'SELECT * FROM holidays ORDER BY holiday_date ASC',
  ).all();

  return c.json({
    holidays: (rows.results ?? []).map((h) => ({
      holidayDate: h.holiday_date,
      name: h.name,
      holidayType: h.holiday_type,
      isActive: h.is_active === 1,
      source: h.source,
    })),
  });
});

holidayRoutes.post('/', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = createHolidaySchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const now = nowUtcIso();
  try {
    await c.env.DB.prepare(
      `INSERT INTO holidays (holiday_date, name, holiday_type, is_active, source, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?)`,
    )
      .bind(
        parsed.data.holidayDate,
        parsed.data.name,
        parsed.data.holidayType,
        parsed.data.source ?? null,
        now,
        now,
      )
      .run();
  } catch {
    return c.json({ error: 'Tanggal libur sudah ada.' }, 409);
  }

  await writeAuditLog(c.env.DB, admin.id, 'CREATE_HOLIDAY', 'holiday', parsed.data.holidayDate);
  return c.json({ ok: true }, 201);
});

holidayRoutes.patch('/:date', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = updateHolidaySchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const holidayDate = c.req.param('date');
  const existing = await c.env.DB.prepare('SELECT holiday_date FROM holidays WHERE holiday_date = ?')
    .bind(holidayDate)
    .first();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const updates: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.name) {
    updates.push('name = ?');
    values.push(parsed.data.name);
  }
  if (parsed.data.holidayType) {
    updates.push('holiday_type = ?');
    values.push(parsed.data.holidayType);
  }
  if (parsed.data.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(parsed.data.isActive ? 1 : 0);
  }
  if (parsed.data.source !== undefined) {
    updates.push('source = ?');
    values.push(parsed.data.source);
  }

  if (updates.length === 0) return c.json({ error: 'No changes' }, 400);

  updates.push('updated_at = ?');
  values.push(nowUtcIso());
  values.push(holidayDate);

  await c.env.DB.prepare(`UPDATE holidays SET ${updates.join(', ')} WHERE holiday_date = ?`)
    .bind(...values)
    .run();

  await writeAuditLog(c.env.DB, admin.id, 'UPDATE_HOLIDAY', 'holiday', holidayDate, parsed.data);
  return c.json({ ok: true });
});
