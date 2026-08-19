import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { generateId } from '@shared/ids';
import { nowUtcIso } from '@shared/datetime';
import {
  requireAdmin,
  requireAuth,
} from '../middleware/auth';

export const areaAssignmentRoutes =
  new Hono<AppContext>();

const createAssignmentSchema = z.object({
  userId: z.string().min(1),
  areaId: z.string().min(1),
});

const updateAssignmentSchema = z.object({
  isActive: z.boolean(),
});

interface AssignmentRow {
  id: string;
  user_id: string;
  area_id: string;
  assigned_from: string;
  assigned_until: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;

  user_name: string;
  username: string;
  area_name: string;
}

/**
 * ADMIN
 * Mengambil semua penugasan.
 *
 * Default hanya assignment aktif.
 * ?history=1 untuk mengambil histori juga.
 */
areaAssignmentRoutes.get('/', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const includeHistory =
    c.req.query('history') === '1';

  const rows = await c.env.DB.prepare(`
    SELECT
      aa.*,
      u.display_name AS user_name,
      u.username,
      a.name AS area_name
    FROM area_assignments aa
    JOIN users u
      ON u.id = aa.user_id
    JOIN areas a
      ON a.id = aa.area_id
    ${includeHistory ? '' : 'WHERE aa.is_active = 1'}
    ORDER BY
      u.display_name ASC,
      a.display_order ASC
  `).all<AssignmentRow>();

  return c.json({
    assignments: rows.results ?? [],
  });
});

/**
 * CS
 * Mengambil area yang sedang menjadi tugas
 * user yang login.
 */
areaAssignmentRoutes.get('/mine', async (c) => {
  const user = requireAuth(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (user.role !== 'CS') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const rows = await c.env.DB.prepare(`
    SELECT
      aa.id AS assignment_id,
      aa.assigned_from,
      a.id AS area_id,
      a.name AS area_name,
      a.slug,
      a.display_order
    FROM area_assignments aa
    JOIN areas a
      ON a.id = aa.area_id
    WHERE aa.user_id = ?
      AND aa.is_active = 1
      AND a.is_active = 1
    ORDER BY a.display_order ASC
  `)
    .bind(user.id)
    .all();

  return c.json({
    areas: rows.results ?? [],
  });
});

/**
 * ADMIN
 * Assign satu area ke satu CS.
 */
areaAssignmentRoutes.post('/', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const parsed = createAssignmentSchema.safeParse(
    await c.req.json().catch(() => null),
  );

  if (!parsed.success) {
    return c.json(
      { error: 'Data penugasan tidak valid.' },
      400,
    );
  }

  const { userId, areaId } = parsed.data;

  // Pastikan user benar-benar CS aktif.
  const user = await c.env.DB.prepare(`
    SELECT id
    FROM users
    WHERE id = ?
      AND role = 'CS'
      AND is_active = 1
  `)
    .bind(userId)
    .first<{ id: string }>();

  if (!user) {
    return c.json(
      { error: 'Cleaning Service tidak ditemukan atau tidak aktif.' },
      404,
    );
  }

  // Pastikan area tersedia dan aktif.
  const area = await c.env.DB.prepare(`
    SELECT id
    FROM areas
    WHERE id = ?
      AND is_active = 1
  `)
    .bind(areaId)
    .first<{ id: string }>();

  if (!area) {
    return c.json(
      { error: 'Area tidak ditemukan atau tidak aktif.' },
      404,
    );
  }

  // Satu area hanya boleh punya satu assignment aktif.
  const existing =
    await c.env.DB.prepare(`
      SELECT id, user_id
      FROM area_assignments
      WHERE area_id = ?
        AND is_active = 1
      LIMIT 1
    `)
      .bind(areaId)
      .first<{
        id: string;
        user_id: string;
      }>();

  if (existing) {
    if (existing.user_id === userId) {
      return c.json(
        { error: 'Area sudah ditugaskan kepada CS tersebut.' },
        409,
      );
    }

    return c.json(
      {
        error:
          'Area masih ditugaskan kepada CS lain. Lakukan rolling terlebih dahulu.',
      },
      409,
    );
  }

  const id = generateId('asg');
  const now = nowUtcIso();

  await c.env.DB.prepare(`
    INSERT INTO area_assignments (
      id,
      user_id,
      area_id,
      assigned_from,
      assigned_until,
      is_active,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, NULL, 1, ?, ?)
  `)
    .bind(
      id,
      userId,
      areaId,
      now,
      now,
      now,
    )
    .run();

  return c.json(
    {
      assignment: {
        id,
        userId,
        areaId,
        assignedFrom: now,
        isActive: true,
      },
    },
    201,
  );
});

/**
 * ADMIN
 * Untuk sekarang PATCH hanya digunakan
 * untuk mengakhiri assignment.
 */
areaAssignmentRoutes.patch('/:id', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const parsed = updateAssignmentSchema.safeParse(
    await c.req.json().catch(() => null),
  );

  if (!parsed.success) {
    return c.json(
      { error: 'Data perubahan tidak valid.' },
      400,
    );
  }

  const assignmentId = c.req.param('id');

  const existing =
    await c.env.DB.prepare(`
      SELECT id, is_active
      FROM area_assignments
      WHERE id = ?
    `)
      .bind(assignmentId)
      .first<{
        id: string;
        is_active: number;
      }>();

  if (!existing) {
    return c.json(
      { error: 'Penugasan tidak ditemukan.' },
      404,
    );
  }

  /*
   * Kita belum mengizinkan reaktivasi assignment lama.
   * Rolling nantinya = tutup assignment lama
   * lalu buat assignment baru.
   */
  if (parsed.data.isActive) {
    return c.json(
      {
        error:
          'Assignment lama tidak dapat diaktifkan kembali. Buat penugasan baru.',
      },
      400,
    );
  }

  if (existing.is_active === 0) {
    return c.json(
      { error: 'Penugasan sudah tidak aktif.' },
      400,
    );
  }

  const now = nowUtcIso();

  await c.env.DB.prepare(`
    UPDATE area_assignments
    SET
      is_active = 0,
      assigned_until = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(now, now, assignmentId)
    .run();

  return c.json({
    ok: true,
  });
});