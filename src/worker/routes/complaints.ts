import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { nowUtcIso } from '@shared/datetime';
import {
  mapComplaint,
  writeAuditLog,
  type DbComplaint,
} from '../db/mappers';
import { requireAdmin } from '../middleware/auth';

export const complaintRoutes = new Hono<AppContext>();

interface DbComplaintPhotoSummary {
  id: string;
  mime_type: string;
  byte_size: number;
  uploaded_at: string;
}

const updateComplaintSchema = z.object({
  status: z
    .enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
    .optional(),
  adminNote: z.string().max(2000).optional(),
});

complaintRoutes.get('/', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const status = c.req.query('status');

  let sql = `
    SELECT c.*, a.name AS area_name
    FROM complaints c
    JOIN areas a ON a.id = c.area_id
  `;

  const binds: unknown[] = [];

  if (status) {
    sql += ' WHERE c.status = ?';
    binds.push(status);
  }

  sql += ' ORDER BY c.submitted_at DESC LIMIT 200';

  const rows = await c.env.DB
    .prepare(sql)
    .bind(...binds)
    .all<DbComplaint & { area_name: string }>();

  return c.json({
    complaints: (rows.results ?? []).map((row) =>
      mapComplaint(row),
    ),
  });
});

complaintRoutes.get('/:id', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const complaintId = c.req.param('id');

  const complaint = await c.env.DB
    .prepare(
      `SELECT c.*, a.name AS area_name
       FROM complaints c
       JOIN areas a ON a.id = c.area_id
       WHERE c.id = ?`,
    )
    .bind(complaintId)
    .first<DbComplaint & { area_name: string }>();

  if (!complaint) {
    return c.json({ error: 'Not found' }, 404);
  }

  const photo = await c.env.DB
    .prepare(
      `SELECT id, mime_type, byte_size, uploaded_at
       FROM complaint_photos
       WHERE complaint_id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(complaintId)
    .first<DbComplaintPhotoSummary>();

  return c.json({
    complaint: {
      ...mapComplaint(complaint),
      photo: photo
        ? {
            id: photo.id,
            mimeType: photo.mime_type,
            byteSize: photo.byte_size,
            uploadedAt: photo.uploaded_at,
          }
        : null,
    },
  });
});

complaintRoutes.patch('/:id', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const parsed = updateComplaintSchema.safeParse(
    await c.req.json(),
  );

  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid payload',
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const complaintId = c.req.param('id');

  const existing = await c.env.DB
    .prepare('SELECT status FROM complaints WHERE id = ?')
    .bind(complaintId)
    .first<{ status: string }>();

  if (!existing) {
    return c.json({ error: 'Not found' }, 404);
  }

  const now = nowUtcIso();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.status) {
    updates.push('status = ?');
    values.push(parsed.data.status);

    if (parsed.data.status === 'RESOLVED') {
      updates.push('resolved_at = ?');
      values.push(now);
    }
  }

  if (parsed.data.adminNote !== undefined) {
    updates.push('admin_note = ?');
    values.push(parsed.data.adminNote);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No changes' }, 400);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(complaintId);

  await c.env.DB
    .prepare(
      `UPDATE complaints
       SET ${updates.join(', ')}
       WHERE id = ?`,
    )
    .bind(...values)
    .run();

  await writeAuditLog(
    c.env.DB,
    admin.id,
    'UPDATE_COMPLAINT',
    'complaint',
    complaintId,
    parsed.data,
  );

  const row = await c.env.DB
    .prepare(
      `SELECT c.*, a.name AS area_name
       FROM complaints c
       JOIN areas a ON a.id = c.area_id
       WHERE c.id = ?`,
    )
    .bind(complaintId)
    .first<DbComplaint & { area_name: string }>();

  if (!row) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({
    complaint: mapComplaint(row),
  });
});