import { ALLOWED_MIME_TYPES } from '@shared/constants';
import { generateId, sha256Hex } from '@shared/ids';
import { nowUtcIso } from '@shared/datetime';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Format foto harus JPEG, PNG, atau WebP.';
  }
  if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
    return 'Ukuran foto tidak valid (maks 10 MB).';
  }
  return null;
}

export function buildReportPhotoKey(
  reportId: string,
  photoType: 'BEFORE' | 'AFTER',
  version: number,
  ext: string,
): string {
  return `reports/${reportId}/${photoType.toLowerCase()}_v${version}.${ext}`;
}

export function buildComplaintPhotoKey(complaintId: string, ext: string): string {
  return `complaints/${complaintId}/photo.${ext}`;
}

export function mimeToExt(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  return 'webp';
}

export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer,
  mimeType: string,
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: { contentType: mimeType },
  });
}

export async function createPhotoMetadata(
  db: D1Database,
  params: {
    reportId: string;
    photoType: 'BEFORE' | 'AFTER';
    r2ObjectKey: string;
    originalFilename: string | null;
    mimeType: string;
    byteSize: number;
    checksum: string;
    capturedAt: string;
  },
) {
  const existing = await db
    .prepare(
      `SELECT MAX(version) AS max_version FROM photos
       WHERE report_id = ? AND photo_type = ?`,
    )
    .bind(params.reportId, params.photoType)
    .first<{ max_version: number | null }>();

  const version = (existing?.max_version ?? 0) + 1;
  const photoId = generateId('pho');
  const now = nowUtcIso();

  await db.batch([
    db.prepare(
      `UPDATE photos SET is_current = 0
       WHERE report_id = ? AND photo_type = ? AND is_current = 1`,
    ).bind(params.reportId, params.photoType),
    db.prepare(
      `INSERT INTO photos (
         id, report_id, photo_type, version, is_current, r2_object_key,
         original_filename, mime_type, byte_size, checksum_sha256,
         captured_at, uploaded_at
       ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      photoId,
      params.reportId,
      params.photoType,
      version,
      params.r2ObjectKey,
      params.originalFilename,
      params.mimeType,
      params.byteSize,
      params.checksum,
      params.capturedAt,
      now,
    ),
    db.prepare(
      `UPDATE reports SET
         ${params.photoType === 'BEFORE' ? 'before_captured_at' : 'after_captured_at'} = ?,
         updated_at = ?
       WHERE id = ?`,
    ).bind(params.capturedAt, now, params.reportId),
  ]);

  return photoId;
}

export { MAX_PHOTO_BYTES, sha256Hex };
