import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { generateId, complaintNumberFromDate } from '@shared/ids';
import { addDaysUtc, nowUtcIso } from '@shared/datetime';
import { mapArea, getSetting, type DbArea } from '../db/mappers';
import { getClientIp } from '../middleware/auth';
import { verifyTurnstile } from '../lib/turnstile';
import {
  buildComplaintPhotoKey,
  mimeToExt,
  uploadToR2,
  validatePhotoFile,
  sha256Hex,
} from '../lib/photos';
import {
  createNotification,
  notifyAdmins,
} from '../lib/notifications';

export const publicRoutes = new Hono<AppContext>();

const publicComplaintSchema = z.object({
  areaId: z.string().min(1),
  complaintText: z.string().trim().min(1).max(5000),
  turnstileToken: z.string().min(1),
});

publicRoutes.get('/areas', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM areas WHERE is_active = 1 ORDER BY display_order ASC',
  ).all<DbArea>();
  return c.json({ areas: (rows.results ?? []).map((r) => mapArea(r, false)).filter(Boolean) });
});

publicRoutes.get('/config', async (c) => {
  const org = await getSetting(c.env.DB, 'organization_name', 'Balai Diklat Industri Medan');
  return c.json({
    organizationName: org,
    turnstileSiteKey: c.env.TURNSTILE_SITE_KEY ?? '',
  });
});

publicRoutes.post('/complaints', async (c) => {
  const formData = await c.req.formData();
  const areaId = String(formData.get('areaId') ?? '');
  const complaintText = String(formData.get('complaintText') ?? '');
  const turnstileToken = String(formData.get('turnstileToken') ?? '');
  const photo = formData.get('photo');

  const parsed = publicComplaintSchema.safeParse({ areaId, complaintText, turnstileToken });
  if (!parsed.success) return c.json({ error: 'Data pengaduan tidak valid.' }, 400);

  const ip = getClientIp(c);
  const turnstileOk = await verifyTurnstile(c.env, turnstileToken, ip);
  if (!turnstileOk) return c.json({ error: 'Verifikasi keamanan gagal.' }, 403);

  const area = await c.env.DB.prepare('SELECT id FROM areas WHERE id = ? AND is_active = 1')
    .bind(areaId)
    .first();

  if (!area) {
    return c.json({ error: 'Area tidak ditemukan.' }, 404);
  }

  const id = generateId('cmp');
  const complaintNumber = complaintNumberFromDate();
  const now = nowUtcIso();

  /*
   * Cari CS yang saat ini bertanggung jawab
   * atas area yang diadukan.
   *
   * Jika tidak ada assignment, pengaduan tetap dibuat
   * dan assigned_user_id akan NULL.
   */
  const assignment = await c.env.DB.prepare(
    `SELECT aa.user_id
   FROM area_assignments aa
   JOIN users u ON u.id = aa.user_id
   WHERE aa.area_id = ?
     AND aa.is_active = 1
     AND u.role = 'CS'
     AND u.is_active = 1
   LIMIT 1`,
  )
    .bind(areaId)
    .first<{ user_id: string }>();

  const assignedUserId = assignment?.user_id ?? null;
  const assignedAt = assignedUserId ? now : null;

  await c.env.DB.prepare(
    `INSERT INTO complaints (
     id,
     complaint_number,
     area_id,
     assigned_user_id,
     complaint_text,
     status,
     submitted_at,
     assigned_at,
     created_at,
     updated_at
   )
   VALUES (?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?)`,
  )
    .bind(
      id,
      complaintNumber,
      areaId,
      assignedUserId,
      complaintText.trim(),
      now,
      assignedAt,
      now,
      now,
    )
    .run();

  if (photo && photo instanceof File && photo.size > 0) {
    const validationError = validatePhotoFile(photo);
    if (validationError) return c.json({ error: validationError }, 400);

    const buffer = await photo.arrayBuffer();
    const checksum = await sha256Hex(buffer);
    const ext = mimeToExt(photo.type);
    const key = buildComplaintPhotoKey(id, ext);
    await uploadToR2(c.env.PHOTO_BUCKET, key, buffer, photo.type);

    const retentionDays = Number(await getSetting(c.env.DB, 'photo_retention_days', '90'));
    const photoId = generateId('cph');
    await c.env.DB.prepare(
      `INSERT INTO complaint_photos (id, complaint_id, r2_object_key, original_filename, mime_type, byte_size, checksum_sha256, uploaded_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        photoId,
        id,
        key,
        photo.name,
        photo.type,
        photo.size,
        checksum,
        now,
        addDaysUtc(now, retentionDays),
      )
      .run();
  }

  const areaName = await c.env.DB.prepare('SELECT name FROM areas WHERE id = ?')
    .bind(areaId)
    .first<{ name: string }>();

  await notifyAdmins(
    c.env.DB,
    'COMPLAINT_NEW',
    'Pengaduan baru',
    `${complaintNumber} — ${areaName?.name ?? 'Area'}`,
    'complaint',
    id,
  );

  if (assignedUserId) {
  await createNotification(
    c.env.DB,
    assignedUserId,
    'COMPLAINT_ASSIGNED',
    'Pengaduan baru di area Anda',
    `${complaintNumber} — ${areaName?.name ?? 'Area'}`,
    'complaint',
    id,
  );
}

  return c.json({ complaintNumber, message: 'Pengaduan berhasil dikirim.' }, 201);
});
