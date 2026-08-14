import { Hono } from 'hono';
import type { AppContext } from '../types';
import { type DbReport } from '../db/mappers';
import { requireAuth } from '../middleware/auth';
import {
  buildReportPhotoKey,
  createPhotoMetadata,
  mimeToExt,
  uploadToR2,
  validatePhotoFile,
  sha256Hex,
} from '../lib/photos';

export const photoRoutes = new Hono<AppContext>();

photoRoutes.post('/reports/:reportId/:photoType', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const reportId = c.req.param('reportId');
  const photoType = c.req.param('photoType').toUpperCase();
  if (photoType !== 'BEFORE' && photoType !== 'AFTER') {
    return c.json({ error: 'Invalid photo type' }, 400);
  }

  const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ?')
    .bind(reportId)
    .first<DbReport>();
  if (!report) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'CS' && report.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  if (!['DRAFT', 'REVISION_REQUIRED'].includes(report.status)) {
    return c.json({ error: 'Foto tidak dapat diunggah pada status laporan ini.' }, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get('photo');
  const capturedAt = String(formData.get('capturedAt') ?? new Date().toISOString());

  if (!(file instanceof File)) return c.json({ error: 'Foto wajib diunggah.' }, 400);

  const validationError = validatePhotoFile(file);
  if (validationError) return c.json({ error: validationError }, 400);

  const buffer = await file.arrayBuffer();
  const checksum = await sha256Hex(buffer);
  const ext = mimeToExt(file.type);

  const versionRow = await c.env.DB.prepare(
    `SELECT MAX(version) AS max_version FROM photos WHERE report_id = ? AND photo_type = ?`,
  )
    .bind(reportId, photoType)
    .first<{ max_version: number | null }>();
  const version = (versionRow?.max_version ?? 0) + 1;
  const key = buildReportPhotoKey(reportId, photoType as 'BEFORE' | 'AFTER', version, ext);

  await uploadToR2(c.env.PHOTO_BUCKET, key, buffer, file.type);
  const photoId = await createPhotoMetadata(c.env.DB, {
    reportId,
    photoType: photoType as 'BEFORE' | 'AFTER',
    r2ObjectKey: key,
    originalFilename: file.name,
    mimeType: file.type,
    byteSize: file.size,
    checksum,
    capturedAt,
  });

  return c.json({ photoId, r2ObjectKey: key });
});

photoRoutes.get('/reports/:photoId', async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const photoId = c.req.param('photoId');
  const photo = await c.env.DB.prepare(
    `SELECT p.*, r.user_id FROM photos p JOIN reports r ON r.id = p.report_id WHERE p.id = ?`,
  )
    .bind(photoId)
    .first<{ r2_object_key: string; mime_type: string; deleted_at: string | null; user_id: string }>();

  if (!photo || photo.deleted_at) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'CS' && photo.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const object = await c.env.PHOTO_BUCKET.get(photo.r2_object_key);
  if (!object) return c.json({ error: 'File not found' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': photo.mime_type,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

photoRoutes.get('/complaints/:photoId', async (c) => {
  const user = requireAuth(c);
  if (!user || user.role !== 'ADMIN') return c.json({ error: 'Forbidden' }, 403);

  const photoId = c.req.param('photoId');
  const photo = await c.env.DB.prepare('SELECT * FROM complaint_photos WHERE id = ?')
    .bind(photoId)
    .first<{ r2_object_key: string; mime_type: string; deleted_at: string | null }>();

  if (!photo || photo.deleted_at) return c.json({ error: 'Not found' }, 404);

  const object = await c.env.PHOTO_BUCKET.get(photo.r2_object_key);
  if (!object) return c.json({ error: 'File not found' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': photo.mime_type,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});
