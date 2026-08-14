import { addDaysUtc, nowUtcIso, toWibDateString } from '@shared/datetime';
import { getSetting } from '../db/mappers';
import { sendEmail } from '../lib/email';
import { countWorkingDaysBetween, loadActiveHolidayDates } from '../lib/working-days';
import type { Env } from '../types';
import { generateId } from '@shared/ids';

export async function handleScheduled(_event: ScheduledEvent, env: Env): Promise<void> {
  await cleanupExpiredPhotos(env);
  await cleanupStaleDrafts(env);
  await cleanupOldAttempts(env);
  await sendInactiveReminders(env);
}

async function cleanupExpiredPhotos(env: Env) {
  const now = nowUtcIso();

  const reportPhotos = await env.DB.prepare(
    `SELECT id, r2_object_key FROM photos
     WHERE expires_at IS NOT NULL AND expires_at <= ? AND deleted_at IS NULL`,
  )
    .bind(now)
    .all<{ id: string; r2_object_key: string }>();

  for (const photo of reportPhotos.results ?? []) {
    await env.PHOTO_BUCKET.delete(photo.r2_object_key);
    await env.DB.prepare(`UPDATE photos SET deleted_at = ? WHERE id = ?`).bind(now, photo.id).run();
  }

  const complaintPhotos = await env.DB.prepare(
    `SELECT id, r2_object_key FROM complaint_photos
     WHERE expires_at IS NOT NULL AND expires_at <= ? AND deleted_at IS NULL`,
  )
    .bind(now)
    .all<{ id: string; r2_object_key: string }>();

  for (const photo of complaintPhotos.results ?? []) {
    await env.PHOTO_BUCKET.delete(photo.r2_object_key);
    await env.DB.prepare(`UPDATE complaint_photos SET deleted_at = ? WHERE id = ?`)
      .bind(now, photo.id)
      .run();
  }
}

async function cleanupStaleDrafts(env: Env) {
  const draftDays = Number(await getSetting(env.DB, 'draft_retention_days', '14'));
  const cutoff = addDaysUtc(nowUtcIso(), -draftDays);

  const staleDrafts = await env.DB.prepare(
    `SELECT id FROM reports WHERE status = 'DRAFT' AND updated_at < ?`,
  )
    .bind(cutoff)
    .all<{ id: string }>();

  for (const draft of staleDrafts.results ?? []) {
    const photos = await env.DB.prepare(
      `SELECT r2_object_key FROM photos WHERE report_id = ? AND deleted_at IS NULL`,
    )
      .bind(draft.id)
      .all<{ r2_object_key: string }>();

    for (const photo of photos.results ?? []) {
      await env.PHOTO_BUCKET.delete(photo.r2_object_key);
    }
    await env.DB.prepare(`DELETE FROM photos WHERE report_id = ?`).bind(draft.id).run();
    await env.DB.prepare(`DELETE FROM reports WHERE id = ?`).bind(draft.id).run();
  }
}

async function cleanupOldAttempts(env: Env) {
  const cutoff = addDaysUtc(nowUtcIso(), -7);
  await env.DB.prepare(`DELETE FROM login_attempts WHERE attempted_at < ?`).bind(cutoff).run();
  await env.DB.prepare(`DELETE FROM idempotency_keys WHERE expires_at < ?`).bind(nowUtcIso()).run();
}

async function sendInactiveReminders(env: Env) {
  const threshold = Number(await getSetting(env.DB, 'inactive_reminder_working_days', '3'));
  const adminEmail = env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;

  const holidays = await loadActiveHolidayDates(env.DB);
  const todayWib = toWibDateString();

  const csUsers = await env.DB.prepare(
    `SELECT id, display_name, email FROM users WHERE role = 'CS' AND is_active = 1`,
  ).all<{ id: string; display_name: string; email: string }>();

  for (const cs of csUsers.results ?? []) {
    const lastReport = await env.DB.prepare(
      `SELECT MAX(submitted_at) AS last_submitted FROM reports
       WHERE user_id = ? AND submitted_at IS NOT NULL`,
    )
      .bind(cs.id)
      .first<{ last_submitted: string | null }>();

    const lastSubmitted = lastReport?.last_submitted;
    if (!lastSubmitted) continue;

    const lastDateWib = toWibDateString(new Date(lastSubmitted));
    const workingDays = countWorkingDaysBetween(lastDateWib, todayWib, holidays);

    if (workingDays < threshold) continue;

    const inactivityKey = `${cs.id}:${todayWib}`;
    const existing = await env.DB.prepare(
      `SELECT id FROM reminder_logs WHERE user_id = ? AND inactivity_key = ?`,
    )
      .bind(cs.id, inactivityKey)
      .first();

    if (existing) continue;

    const subject = `[BDI Cleaning] CS tidak aktif: ${cs.display_name}`;
    const html = `<p>Cleaning Service <strong>${cs.display_name}</strong> (${cs.email}) belum mengirim laporan selama ${workingDays} hari kerja.</p>
<p>Terakhir submit: ${lastSubmitted}</p>`;

    const sent = await sendEmail(env, adminEmail, subject, html);
    if (!sent) continue;

    await env.DB.prepare(
      `INSERT INTO reminder_logs (id, user_id, inactivity_key, last_submitted_at, working_days_inactive, recipient_email, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        generateId('rml'),
        cs.id,
        inactivityKey,
        lastSubmitted,
        workingDays,
        adminEmail,
        nowUtcIso(),
      )
      .run();
  }
}
