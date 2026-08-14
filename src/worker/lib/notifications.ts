import { generateId } from '@shared/ids';

export async function createNotification(
  db: D1Database,
  userId: string,
  notificationType: string,
  title: string,
  message: string,
  relatedEntityType?: string,
  relatedEntityId?: string,
) {
  const id = generateId('ntf');
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, notification_type, title, message, related_entity_type, related_entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      userId,
      notificationType,
      title,
      message,
      relatedEntityType ?? null,
      relatedEntityId ?? null,
    )
    .run();
}

export async function notifyAdmins(
  db: D1Database,
  notificationType: string,
  title: string,
  message: string,
  relatedEntityType?: string,
  relatedEntityId?: string,
) {
  const admins = await db
    .prepare(`SELECT id FROM users WHERE role = 'ADMIN' AND is_active = 1`)
    .all<{ id: string }>();

  for (const admin of admins.results ?? []) {
    await createNotification(
      db,
      admin.id,
      notificationType,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
    );
  }
}
