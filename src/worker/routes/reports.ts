import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { generateId, reportNumberFromDate } from '@shared/ids';
import { addDaysUtc, nowUtcIso } from '@shared/datetime';
import {
  mapReport,
  mapPhoto,
  type DbReport,
  type DbPhoto,
  writeAuditLog,
  getSetting,
} from '../db/mappers';
import { requireAdmin, requireAuth, requireCs } from '../middleware/auth';
import { createNotification, notifyAdmins } from '../lib/notifications';

export const reportRoutes = new Hono<AppContext>();

const createReportSchema = z.object({
  areaId: z.string().min(1),
});

const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REVISION_REQUIRED', 'REJECTED']),
  note: z.string().max(2000).optional(),
});

async function loadReportWithPhotos(db: D1Database, reportId: string) {
  const report = await db
    .prepare(
      `SELECT r.*, a.name AS area_name FROM reports r
       JOIN areas a ON a.id = r.area_id WHERE r.id = ?`,
    )
    .bind(reportId)
    .first<DbReport & { area_name: string }>();

  if (!report) return null;

  const photos = await db
    .prepare(
      `SELECT * FROM photos WHERE report_id = ? AND is_current = 1 AND deleted_at IS NULL`,
    )
    .bind(reportId)
    .all<DbPhoto>();

  return {
    ...mapReport(report),
    photos: (photos.results ?? []).map(mapPhoto),
  };
}

reportRoutes.get('/', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const status = c.req.query('status');
  const userId = c.req.query('userId');
  const areaId = c.req.query('areaId');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const reportNumber = c.req.query('reportNumber');

  let sql = `SELECT r.*, a.name AS area_name FROM reports r JOIN areas a ON a.id = r.area_id`;
  const conditions: string[] = [];
  const binds: unknown[] = [];

  if (user.role === 'CS') {
    conditions.push('r.user_id = ?');
    binds.push(user.id);
  } else if (userId) {
    conditions.push('r.user_id = ?');
    binds.push(userId);
  }

  if (status) {
    conditions.push('r.status = ?');
    binds.push(status);
  }
  if (areaId) {
    conditions.push('r.area_id = ?');
    binds.push(areaId);
  }
  if (dateFrom) {
    conditions.push(`date(r.submitted_at, '+7 hours') >= ?`);
    binds.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`date(r.submitted_at, '+7 hours') <= ?`);
    binds.push(dateTo);
  }
  if (reportNumber) {
    conditions.push('r.report_number LIKE ?');
    binds.push(`%${reportNumber}%`);
  }

  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ' ORDER BY r.updated_at DESC LIMIT 200';
  const rows = await c.env.DB
  .prepare(sql)
  .bind(...binds)
  .all<DbReport & { area_name: string }>();

return c.json({
  reports: (rows.results ?? []).map((row) =>
    mapReport(row),
  ),
});
});

reportRoutes.get('/:id', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const reportId = c.req.param('id');
  const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ?')
    .bind(reportId)
    .first<DbReport>();
  if (!report) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'CS' && report.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const full = await loadReportWithPhotos(c.env.DB, reportId);
  return c.json({ report: full });
});

reportRoutes.post('/', async (c) => {
  const cs = requireCs(c);
  if (!cs) return c.json({ error: 'Forbidden' }, 403);

  const parsed = createReportSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const area = await c.env.DB.prepare('SELECT * FROM areas WHERE id = ? AND is_active = 1')
    .bind(parsed.data.areaId)
    .first();
  if (!area) return c.json({ error: 'Area tidak ditemukan atau tidak aktif.' }, 404);

  const dbUser = await c.env.DB.prepare('SELECT display_name, email FROM users WHERE id = ?')
    .bind(cs.id)
    .first<{ display_name: string; email: string }>();

  const id = generateId('rpt');
  const reportNumber = reportNumberFromDate();
  const now = nowUtcIso();

  await c.env.DB.prepare(
    `INSERT INTO reports (id, report_number, user_id, area_id, reporter_name, reporter_email, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)`,
  )
    .bind(id, reportNumber, cs.id, parsed.data.areaId, dbUser!.display_name, dbUser!.email, now, now)
    .run();

  await writeAuditLog(c.env.DB, cs.id, 'CREATE_REPORT', 'report', id);
  const report = await loadReportWithPhotos(c.env.DB, id);
  return c.json({ report }, 201);
});

reportRoutes.post('/:id/submit', async (c) => {
  const cs = requireCs(c);
  if (!cs) return c.json({ error: 'Forbidden' }, 403);

  const reportId = c.req.param('id');
  const idempotencyKey = c.req.header('Idempotency-Key');

  if (idempotencyKey) {
    const cached = await c.env.DB.prepare(
      `SELECT response_status, response_body FROM idempotency_keys
       WHERE idempotency_key = ? AND user_id = ? AND endpoint = ? AND expires_at > ?`,
    )
      .bind(idempotencyKey, cs.id, `submit:${reportId}`, nowUtcIso())
      .first<{ response_status: number; response_body: string }>();
    if (cached) {
      return new Response(cached.response_body, {
        status: cached.response_status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ?')
    .bind(reportId)
    .first<DbReport>();
  if (!report) return c.json({ error: 'Not found' }, 404);
  if (report.user_id !== cs.id) return c.json({ error: 'Forbidden' }, 403);
  if (!['DRAFT', 'REVISION_REQUIRED'].includes(report.status)) {
    return c.json({ error: 'Laporan tidak dapat dikirim pada status ini.' }, 400);
  }

  const photos = await c.env.DB.prepare(
    `SELECT photo_type FROM photos WHERE report_id = ? AND is_current = 1 AND deleted_at IS NULL`,
  )
    .bind(reportId)
    .all<{ photo_type: string }>();

  const types = new Set((photos.results ?? []).map((p) => p.photo_type));
  if (!types.has('BEFORE') || !types.has('AFTER')) {
    return c.json({ error: 'Foto before dan after harus sudah diunggah.' }, 400);
  }

  const now = nowUtcIso();
  const retentionDays = Number(await getSetting(c.env.DB, 'photo_retention_days', '90'));
  const expiresAt = addDaysUtc(now, retentionDays);
  const newStatus = report.status === 'REVISION_REQUIRED' ? 'RESUBMITTED' : 'SUBMITTED';

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE reports SET status = ?, submitted_at = ?, updated_at = ? WHERE id = ?`,
    ).bind(newStatus, now, now, reportId),
    c.env.DB.prepare(`UPDATE photos SET expires_at = ? WHERE report_id = ? AND deleted_at IS NULL`).bind(
      expiresAt,
      reportId,
    ),
  ]);

  await writeAuditLog(c.env.DB, cs.id, 'SUBMIT_REPORT', 'report', reportId);

  const areaRow = await c.env.DB.prepare('SELECT name FROM areas WHERE id = ?')
    .bind(report.area_id)
    .first<{ name: string }>();

  const notifTitle =
    newStatus === 'RESUBMITTED' ? 'Laporan dikirim ulang' : 'Laporan baru masuk';
  const notifMessage = `${report.report_number} — ${areaRow?.name ?? 'Area'} (${cs.displayName})`;
  await notifyAdmins(
    c.env.DB,
    newStatus === 'RESUBMITTED' ? 'REPORT_RESUBMITTED' : 'REPORT_SUBMITTED',
    notifTitle,
    notifMessage,
    'report',
    reportId,
  );

  const full = await loadReportWithPhotos(c.env.DB, reportId);
  const responseBody = JSON.stringify({ report: full });

  if (idempotencyKey) {
    await c.env.DB.prepare(
      `INSERT INTO idempotency_keys (idempotency_key, user_id, endpoint, response_status, response_body, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(idempotencyKey, cs.id, `submit:${reportId}`, 200, responseBody, addDaysUtc(now, 1))
      .run();
  }

  return c.json({ report: full });
});

reportRoutes.post('/:id/review', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const parsed = reviewSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const { decision, note } = parsed.data;
  if (decision !== 'APPROVED' && (!note || note.trim().length === 0)) {
    return c.json({ error: 'Catatan admin wajib untuk keputusan ini.' }, 400);
  }

  const reportId = c.req.param('id');
  const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ?')
    .bind(reportId)
    .first<DbReport>();
  if (!report) return c.json({ error: 'Not found' }, 404);
  if (!['SUBMITTED', 'RESUBMITTED'].includes(report.status)) {
    return c.json({ error: 'Laporan tidak dapat direview pada status ini.' }, 400);
  }

  const now = nowUtcIso();
  let newStatus: string;
  if (decision === 'APPROVED') newStatus = 'APPROVED';
  else if (decision === 'REVISION_REQUIRED') newStatus = 'REVISION_REQUIRED';
  else newStatus = 'REJECTED';

  const reviewId = generateId('rev');
  const updates: Record<string, string | null> = {
    status: newStatus,
    admin_note: note ?? null,
    updated_at: now,
  };
  if (decision === 'APPROVED') updates.approved_at = now;
  if (decision === 'REJECTED') updates.rejected_at = now;

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE reports SET status = ?, admin_note = ?, approved_at = ?, rejected_at = ?, updated_at = ? WHERE id = ?`,
    ).bind(
      newStatus,
      note ?? null,
      decision === 'APPROVED' ? now : report.approved_at,
      decision === 'REJECTED' ? now : report.rejected_at,
      now,
      reportId,
    ),
    c.env.DB.prepare(
      `INSERT INTO reviews (id, report_id, admin_user_id, decision, note) VALUES (?, ?, ?, ?, ?)`,
    ).bind(reviewId, reportId, admin.id, decision, note ?? null),
  ]);

  await writeAuditLog(c.env.DB, admin.id, 'REVIEW_REPORT', 'report', reportId, { decision });

  const decisionLabels: Record<string, string> = {
    APPROVED: 'Laporan disetujui',
    REVISION_REQUIRED: 'Laporan perlu perbaikan',
    REJECTED: 'Laporan ditolak',
  };
  await createNotification(
    c.env.DB,
    report.user_id,
    `REPORT_${decision}`,
    decisionLabels[decision] ?? 'Status laporan diperbarui',
    `${report.report_number}${note ? `: ${note}` : ''}`,
    'report',
    reportId,
  );

  const full = await loadReportWithPhotos(c.env.DB, reportId);
  return c.json({ report: full });
});

reportRoutes.get('/:id/reviews', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const reportId = c.req.param('id');
  const report = await c.env.DB.prepare('SELECT user_id FROM reports WHERE id = ?')
    .bind(reportId)
    .first<{ user_id: string }>();
  if (!report) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'CS' && report.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const rows = await c.env.DB.prepare(
    `SELECT rv.*, u.display_name AS admin_name FROM reviews rv
     JOIN users u ON u.id = rv.admin_user_id
     WHERE rv.report_id = ? ORDER BY rv.created_at DESC`,
  )
    .bind(reportId)
    .all();

  return c.json({
    reviews: (rows.results ?? []).map((r) => ({
      id: r.id as string,
      reportId: r.report_id as string,
      adminUserId: r.admin_user_id as string,
      adminName: r.admin_name as string,
      decision: r.decision as 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED',
      note: (r.note as string | null) ?? null,
      createdAt: r.created_at as string,
    })),
  });
});
