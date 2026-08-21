import type { SessionUser } from '../types';

export interface DbUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  role: 'ADMIN' | 'CS';
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbArea {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbReport {
  id: string;
  report_number: string;
  user_id: string;
  area_id: string;
  reporter_name: string;
  reporter_email: string;
  status: string;
  before_captured_at: string | null;
  after_captured_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPhoto {
  id: string;
  report_id: string;
  photo_type: 'BEFORE' | 'AFTER';
  version: number;
  is_current: number;
  r2_object_key: string;
  original_filename: string | null;
  mime_type: string;
  byte_size: number;
  checksum_sha256: string | null;
  captured_at: string;
  uploaded_at: string;
  expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface DbComplaint {
  id: string;
  complaint_number: string;
  area_id: string;

  assigned_user_id: string | null;

  complaint_text: string;
  status: string;
  submitted_at: string;

  assigned_at: string | null;
  started_at: string | null;
  waiting_verification_at: string | null;

  resolved_at: string | null;
  admin_note: string | null;

  created_at: string;
  updated_at: string;

  // Field tambahan dari hasil JOIN
  area_name?: string;
  assigned_user_name?: string | null;
  photo_id?: string | null;
  photo_mime_type?: string | null;
  photo_byte_size?: number | null;
  photo_uploaded_at?: string | null;
  completion_photo_id?: string | null;
  completion_photo_mime_type?: string | null;
  completion_photo_byte_size?: number | null;
  completion_photo_uploaded_at?: string | null;
}

export function mapUser(row: DbUser) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active === 1,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSessionUser(row: DbUser): SessionUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
  };
}

export function mapArea(row: DbArea, includeInactive = true) {
  if (!includeInactive && row.is_active !== 1) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    displayOrder: row.display_order,
    isActive: row.is_active === 1,
  };
}

export function mapReport(row: DbReport & { area_name?: string }) {
  return {
    id: row.id,
    reportNumber: row.report_number,
    userId: row.user_id,
    areaId: row.area_id,
    areaName: row.area_name,
    reporterName: row.reporter_name,
    reporterEmail: row.reporter_email,
    status: row.status,
    beforeCapturedAt: row.before_captured_at,
    afterCapturedAt: row.after_captured_at,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPhoto(row: DbPhoto) {
  return {
    id: row.id,
    reportId: row.report_id,
    photoType: row.photo_type,
    version: row.version,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    capturedAt: row.captured_at,
    uploadedAt: row.uploaded_at,
    expiresAt: row.expires_at,
    deletedAt: row.deleted_at,
  };
}

export function mapComplaint(row: DbComplaint) {
  const photo = row.photo_id
    ? {
        id: row.photo_id,
        mimeType: row.photo_mime_type,
        byteSize: row.photo_byte_size,
        uploadedAt: row.photo_uploaded_at,
      }
    : null;
  const completionPhoto = row.completion_photo_id
    ? {
        id: row.completion_photo_id,
        mimeType: row.completion_photo_mime_type,
        byteSize: row.completion_photo_byte_size,
        uploadedAt: row.completion_photo_uploaded_at,
      }
    : null;

  return {
    id: row.id,
    complaintNumber: row.complaint_number,
    areaId: row.area_id,
    areaName: row.area_name ?? null,

    assignedUserId: row.assigned_user_id ?? null,

    assignedUserName: row.assigned_user_name ?? null,

    complaintText: row.complaint_text,
    status: row.status,
    submittedAt: row.submitted_at,

    assignedAt: row.assigned_at ?? null,
    startedAt: row.started_at ?? null,
    waitingVerificationAt: row.waiting_verification_at ?? null,

    resolvedAt: row.resolved_at ?? null,
    adminNote: row.admin_note ?? null,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photo,
    completionPhoto,
  };
}

export async function writeAuditLog(
  db: D1Database,
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>,
) {
  const id = `aud_${crypto.randomUUID().replace(/-/g, '')}`;
  await db
    .prepare(
      `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, actorUserId, action, entityType, entityId, details ? JSON.stringify(details) : null)
    .run();
}

export async function getSetting(db: D1Database, key: string, fallback: string): Promise<string> {
  const row = await db
    .prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?')
    .bind(key)
    .first<{ setting_value: string }>();
  return row?.setting_value ?? fallback;
}
