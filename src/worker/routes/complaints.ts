import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { addDaysUtc, nowUtcIso } from '@shared/datetime';
import { mapComplaint, writeAuditLog, type DbComplaint, getSetting } from '../db/mappers';
import { requireAdmin, requireAuth, requireCs } from '../middleware/auth';
import { createNotification, notifyAdmins } from '../lib/notifications';
import { generateId } from '@shared/ids';
import {
  buildComplaintPhotoKey,
  mimeToExt,
  sha256Hex,
  uploadToR2,
  validatePhotoFile,
} from '../lib/photos';

export const complaintRoutes = new Hono<AppContext>();

const updateComplaintSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']).optional(),
  adminNote: z.string().max(2000).optional(),
});

const returnComplaintSchema = z.object({
  note: z.string().trim().min(3).max(2000),
});

complaintRoutes.get('/', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const status = c.req.query('status');

  let sql = `
    SELECT
      c.*,
      a.name AS area_name,
      assigned_user.display_name AS assigned_user_name,
      submission_photo.id AS photo_id,
      submission_photo.mime_type AS photo_mime_type,
      submission_photo.byte_size AS photo_byte_size,
      submission_photo.uploaded_at AS photo_uploaded_at,
      completion_photo.id AS completion_photo_id,
      completion_photo.mime_type AS completion_photo_mime_type,
      completion_photo.byte_size AS completion_photo_byte_size,
      completion_photo.uploaded_at AS completion_photo_uploaded_at
    FROM complaints c
    JOIN areas a
      ON a.id = c.area_id
    LEFT JOIN users assigned_user
      ON assigned_user.id = c.assigned_user_id
    LEFT JOIN complaint_photos submission_photo
      ON submission_photo.id = (
        SELECT cp.id FROM complaint_photos cp
        WHERE cp.complaint_id = c.id AND cp.photo_type = 'SUBMISSION' AND cp.deleted_at IS NULL
        ORDER BY cp.uploaded_at DESC LIMIT 1
      )
    LEFT JOIN complaint_photos completion_photo
      ON completion_photo.id = (
        SELECT cp.id FROM complaint_photos cp
        WHERE cp.complaint_id = c.id AND cp.photo_type = 'COMPLETION_EVIDENCE' AND cp.deleted_at IS NULL
        ORDER BY cp.uploaded_at DESC LIMIT 1
      )
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
    .all<DbComplaint>();

  return c.json({
    complaints: (rows.results ?? []).map((row) =>
      mapComplaint(row),
    ),
  });
});

complaintRoutes.get('/mine', async (c) => {
  const cs = requireCs(c);

  if (!cs) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const status = c.req.query('status');

  let sql = `
    SELECT
      c.*,
      a.name AS area_name,
      assigned_user.display_name AS assigned_user_name,
      submission_photo.id AS photo_id,
      submission_photo.mime_type AS photo_mime_type,
      submission_photo.byte_size AS photo_byte_size,
      submission_photo.uploaded_at AS photo_uploaded_at,
      completion_photo.id AS completion_photo_id,
      completion_photo.mime_type AS completion_photo_mime_type,
      completion_photo.byte_size AS completion_photo_byte_size,
      completion_photo.uploaded_at AS completion_photo_uploaded_at
    FROM complaints c
    JOIN areas a
      ON a.id = c.area_id
    LEFT JOIN users assigned_user
      ON assigned_user.id = c.assigned_user_id
    LEFT JOIN complaint_photos submission_photo
      ON submission_photo.id = (
        SELECT cp.id FROM complaint_photos cp
        WHERE cp.complaint_id = c.id AND cp.photo_type = 'SUBMISSION' AND cp.deleted_at IS NULL
        ORDER BY cp.uploaded_at DESC LIMIT 1
      )
    LEFT JOIN complaint_photos completion_photo
      ON completion_photo.id = (
        SELECT cp.id FROM complaint_photos cp
        WHERE cp.complaint_id = c.id AND cp.photo_type = 'COMPLETION_EVIDENCE' AND cp.deleted_at IS NULL
        ORDER BY cp.uploaded_at DESC LIMIT 1
      )
    WHERE c.assigned_user_id = ?
  `;

  const binds: unknown[] = [cs.id];

  if (status) {
    sql += ' AND c.status = ?';
    binds.push(status);
  }

  sql += ' ORDER BY c.submitted_at DESC LIMIT 200';

  const rows = await c.env.DB
    .prepare(sql)
    .bind(...binds)
    .all<DbComplaint>();

  return c.json({
    complaints: (rows.results ?? []).map((row) =>
      mapComplaint(row),
    ),
  });
});

complaintRoutes.get('/:id', async (c) => {
  const user = requireAuth(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const complaintId = c.req.param('id');

  const complaint = await c.env.DB.prepare(
    `SELECT
       c.*,
       a.name AS area_name,
       assigned_user.display_name AS assigned_user_name,
       submission_photo.id AS photo_id,
       submission_photo.mime_type AS photo_mime_type,
       submission_photo.byte_size AS photo_byte_size,
       submission_photo.uploaded_at AS photo_uploaded_at,
       completion_photo.id AS completion_photo_id,
       completion_photo.mime_type AS completion_photo_mime_type,
       completion_photo.byte_size AS completion_photo_byte_size,
       completion_photo.uploaded_at AS completion_photo_uploaded_at
     FROM complaints c
     JOIN areas a
       ON a.id = c.area_id
     LEFT JOIN users assigned_user
       ON assigned_user.id = c.assigned_user_id
     LEFT JOIN complaint_photos submission_photo
       ON submission_photo.id = (
         SELECT cp.id FROM complaint_photos cp
         WHERE cp.complaint_id = c.id AND cp.photo_type = 'SUBMISSION' AND cp.deleted_at IS NULL
         ORDER BY cp.uploaded_at DESC LIMIT 1
       )
     LEFT JOIN complaint_photos completion_photo
       ON completion_photo.id = (
         SELECT cp.id FROM complaint_photos cp
         WHERE cp.complaint_id = c.id AND cp.photo_type = 'COMPLETION_EVIDENCE' AND cp.deleted_at IS NULL
         ORDER BY cp.uploaded_at DESC LIMIT 1
       )
     WHERE c.id = ?`,
  )
    .bind(complaintId)
    .first<DbComplaint>();

  if (!complaint) {
    return c.json({ error: 'Not found' }, 404);
  }

  /*
   * Admin boleh melihat semua pengaduan.
   *
   * CS hanya boleh melihat pengaduan
   * yang memang ditugaskan kepadanya.
   */
  if (user.role === 'CS' && complaint.assigned_user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  return c.json({
    complaint: mapComplaint(complaint),
  });
});

complaintRoutes.post('/:id/start', async (c) => {
  const cs = requireCs(c);

  if (!cs) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const complaintId = c.req.param('id');

  const complaint = await c.env.DB.prepare(
    `SELECT id, status, assigned_user_id
       FROM complaints
       WHERE id = ?`,
  )
    .bind(complaintId)
    .first<{
      id: string;
      status: string;
      assigned_user_id: string | null;
    }>();

  if (!complaint) {
    return c.json({ error: 'Pengaduan tidak ditemukan.' }, 404);
  }

  if (complaint.assigned_user_id !== cs.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  if (complaint.status !== 'NEW') {
    return c.json(
      {
        error: 'Pengaduan hanya dapat mulai ditangani ketika status masih baru.',
      },
      400,
    );
  }

  const now = nowUtcIso();

  await c.env.DB.prepare(
    `UPDATE complaints
       SET
         status = 'IN_PROGRESS',
         started_at = ?,
         updated_at = ?
       WHERE id = ?`,
  )
    .bind(now, now, complaintId)
    .run();

  await writeAuditLog(c.env.DB, cs.id, 'START_COMPLAINT', 'complaint', complaintId);

  return c.json({
    ok: true,
    status: 'IN_PROGRESS',
  });
});

complaintRoutes.post('/:id/complete', async (c) => {
  const cs = requireCs(c);

  if (!cs) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const complaintId = c.req.param('id');

  const complaint = await c.env.DB.prepare(
    `SELECT id, status, assigned_user_id, complaint_number, area_id
       FROM complaints
       WHERE id = ?`,
  )
    .bind(complaintId)
    .first<{
      id: string;
      status: string;
      assigned_user_id: string | null;
      complaint_number: string;
      area_id: string;
    }>();

  if (!complaint) {
    return c.json({ error: 'Pengaduan tidak ditemukan.' }, 404);
  }

  if (complaint.assigned_user_id !== cs.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  if (complaint.status !== 'IN_PROGRESS') {
    return c.json(
      {
        error: 'Pengaduan hanya dapat diselesaikan ketika sedang diproses.',
      },
      400,
    );
  }

  const now = nowUtcIso();
  const contentType = c.req.header('Content-Type') ?? '';
  let evidencePhoto: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const value = formData.get('photo');
    if (value instanceof File && value.size > 0) evidencePhoto = value;
  }

  if (evidencePhoto) {
    const validationError = validatePhotoFile(evidencePhoto);
    if (validationError) return c.json({ error: validationError }, 400);
  }

  const previousEvidence = await c.env.DB.prepare(
    `SELECT id, r2_object_key FROM complaint_photos
     WHERE complaint_id = ? AND photo_type = 'COMPLETION_EVIDENCE' AND deleted_at IS NULL`,
  )
    .bind(complaintId)
    .all<{ id: string; r2_object_key: string }>();

  if (evidencePhoto) {
    const photoId = generateId('cph');
    const buffer = await evidencePhoto.arrayBuffer();
    const checksum = await sha256Hex(buffer);
    const ext = mimeToExt(evidencePhoto.type);
    const key = buildComplaintPhotoKey(complaintId, ext, 'completion', photoId);
    const retentionDays = Number(await getSetting(c.env.DB, 'photo_retention_days', '90'));

    await uploadToR2(c.env.PHOTO_BUCKET, key, buffer, evidencePhoto.type);

    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE complaint_photos SET deleted_at = ?
           WHERE complaint_id = ? AND photo_type = 'COMPLETION_EVIDENCE' AND deleted_at IS NULL`,
        ).bind(now, complaintId),
        c.env.DB.prepare(
          `INSERT INTO complaint_photos (
             id, complaint_id, r2_object_key, original_filename, mime_type,
             byte_size, checksum_sha256, uploaded_at, expires_at, photo_type
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETION_EVIDENCE')`,
        ).bind(
          photoId,
          complaintId,
          key,
          evidencePhoto.name,
          evidencePhoto.type,
          evidencePhoto.size,
          checksum,
          now,
          addDaysUtc(now, retentionDays),
        ),
        c.env.DB.prepare(
          `UPDATE complaints SET status = 'WAITING_VERIFICATION',
             waiting_verification_at = ?, updated_at = ? WHERE id = ?`,
        ).bind(now, now, complaintId),
      ]);
    } catch (error) {
      await c.env.PHOTO_BUCKET.delete(key);
      throw error;
    }

    for (const oldPhoto of previousEvidence.results ?? []) {
      await c.env.PHOTO_BUCKET.delete(oldPhoto.r2_object_key);
    }
  } else {
    await c.env.DB.prepare(
      `UPDATE complaints SET status = 'WAITING_VERIFICATION',
         waiting_verification_at = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(now, now, complaintId)
      .run();
  }

  await writeAuditLog(c.env.DB, cs.id, 'COMPLETE_COMPLAINT', 'complaint', complaintId, {
    evidencePhotoUploaded: Boolean(evidencePhoto),
  });

  const area = await c.env.DB.prepare(
    `SELECT name
       FROM areas
       WHERE id = ?`,
  )
    .bind(complaint.area_id)
    .first<{ name: string }>();

  await notifyAdmins(
    c.env.DB,
    'COMPLAINT_WAITING_VERIFICATION',
    'Pengaduan menunggu verifikasi',
    `${complaint.complaint_number} — ${area?.name ?? 'Area'} telah diselesaikan oleh ${cs.displayName}`,
    'complaint',
    complaintId,
  );

  return c.json({
    ok: true,
    status: 'WAITING_VERIFICATION',
  });
});

complaintRoutes.post('/verify-all', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const pending = await c.env.DB.prepare(
    `SELECT id, complaint_number, assigned_user_id
     FROM complaints WHERE status = 'WAITING_VERIFICATION'`,
  ).all<{
    id: string;
    complaint_number: string;
    assigned_user_id: string | null;
  }>();

  const complaints = pending.results ?? [];
  if (complaints.length === 0) return c.json({ ok: true, verifiedCount: 0 });

  const now = nowUtcIso();
  await c.env.DB.prepare(
    `UPDATE complaints SET status = 'RESOLVED', resolved_at = ?, updated_at = ?
     WHERE status = 'WAITING_VERIFICATION'`,
  )
    .bind(now, now)
    .run();

  for (const complaint of complaints) {
    await writeAuditLog(c.env.DB, admin.id, 'VERIFY_COMPLAINT', 'complaint', complaint.id, {
      bulk: true,
    });

    if (complaint.assigned_user_id) {
      await createNotification(
        c.env.DB,
        complaint.assigned_user_id,
        'COMPLAINT_RESOLVED',
        'Pengaduan telah diverifikasi',
        `${complaint.complaint_number} telah diverifikasi selesai oleh admin.`,
        'complaint',
        complaint.id,
      );
    }
  }

  return c.json({ ok: true, verifiedCount: complaints.length });
});

complaintRoutes.post('/:id/verify', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const complaintId = c.req.param('id');

  const complaint = await c.env.DB.prepare(
    `SELECT
         id,
         complaint_number,
         status,
         assigned_user_id
       FROM complaints
       WHERE id = ?`,
  )
    .bind(complaintId)
    .first<{
      id: string;
      complaint_number: string;
      status: string;
      assigned_user_id: string | null;
    }>();

  if (!complaint) {
    return c.json({ error: 'Pengaduan tidak ditemukan.' }, 404);
  }

  if (complaint.status !== 'WAITING_VERIFICATION') {
    return c.json(
      {
        error: 'Hanya pengaduan yang menunggu verifikasi yang dapat diselesaikan.',
      },
      400,
    );
  }

  const now = nowUtcIso();

  await c.env.DB.prepare(
    `UPDATE complaints
       SET
         status = 'RESOLVED',
         resolved_at = ?,
         updated_at = ?
       WHERE id = ?`,
  )
    .bind(now, now, complaintId)
    .run();

  await writeAuditLog(c.env.DB, admin.id, 'VERIFY_COMPLAINT', 'complaint', complaintId);

  if (complaint.assigned_user_id) {
    await createNotification(
      c.env.DB,
      complaint.assigned_user_id,
      'COMPLAINT_RESOLVED',
      'Pengaduan telah diverifikasi',
      `${complaint.complaint_number} telah diverifikasi selesai oleh admin.`,
      'complaint',
      complaintId,
    );
  }

  return c.json({
    ok: true,
    status: 'RESOLVED',
  });
});

complaintRoutes.post('/:id/return', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const parsed = returnComplaintSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsed.success) {
    return c.json(
      {
        error: 'Catatan tindak lanjut wajib diisi minimal 3 karakter.',
      },
      400,
    );
  }

  const complaintId = c.req.param('id');

  const complaint = await c.env.DB.prepare(
    `SELECT
         id,
         complaint_number,
         status,
         assigned_user_id
       FROM complaints
       WHERE id = ?`,
  )
    .bind(complaintId)
    .first<{
      id: string;
      complaint_number: string;
      status: string;
      assigned_user_id: string | null;
    }>();

  if (!complaint) {
    return c.json({ error: 'Pengaduan tidak ditemukan.' }, 404);
  }

  if (complaint.status !== 'WAITING_VERIFICATION') {
    return c.json(
      {
        error: 'Pengaduan ini tidak sedang menunggu verifikasi.',
      },
      400,
    );
  }

  if (!complaint.assigned_user_id) {
    return c.json(
      {
        error: 'Pengaduan tidak memiliki CS penanggung jawab.',
      },
      400,
    );
  }

  const now = nowUtcIso();
  const note = parsed.data.note;

  await c.env.DB.prepare(
    `UPDATE complaints
       SET
         status = 'IN_PROGRESS',
         admin_note = ?,
         waiting_verification_at = NULL,
         updated_at = ?
       WHERE id = ?`,
  )
    .bind(note, now, complaintId)
    .run();

  await writeAuditLog(c.env.DB, admin.id, 'RETURN_COMPLAINT', 'complaint', complaintId, {
    note,
  });

  await createNotification(
    c.env.DB,
    complaint.assigned_user_id,
    'COMPLAINT_FOLLOW_UP_REQUIRED',
    'Pengaduan perlu ditindaklanjuti',
    `${complaint.complaint_number}: ${note}`,
    'complaint',
    complaintId,
  );

  return c.json({
    ok: true,
    status: 'IN_PROGRESS',
  });
});

complaintRoutes.patch('/:id', async (c) => {
  const admin = requireAdmin(c);

  if (!admin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const parsed = updateComplaintSchema.safeParse(await c.req.json());

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

  const existing = await c.env.DB.prepare('SELECT status FROM complaints WHERE id = ?')
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

  await c.env.DB.prepare(
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

  const row = await c.env.DB.prepare(
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
