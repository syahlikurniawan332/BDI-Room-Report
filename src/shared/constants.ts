/** Shared constants and types between client and worker */

export const REPORT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'REVISION_REQUIRED',
  'RESUBMITTED',
  'APPROVED',
  'REJECTED',
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const COMPLAINT_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const USER_ROLES = ['ADMIN', 'CS'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const PHOTO_TYPES = ['BEFORE', 'AFTER'] as const;

export type PhotoType = (typeof PHOTO_TYPES)[number];

export const ALLOWED_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const SESSION_COOKIE = 'bdi_session';
export const SESSION_HOURS = 12;
export const LOGIN_MAX_ATTEMPTS = 10;
export const LOGIN_WINDOW_MINUTES = 15;

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface UserPublic {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AreaPublic {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ReportPublic {
  id: string;
  reportNumber: string;
  userId: string;
  areaId: string;
  areaName?: string;
  reporterName: string;
  reporterEmail: string;
  status: ReportStatus;
  beforeCapturedAt: string | null;
  afterCapturedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  photos?: PhotoPublic[];
  beforePhotoId?: string | null;
  afterPhotoId?: string | null;
}


export interface PhotoPublic {
  id: string;
  reportId: string;
  photoType: PhotoType;
  mimeType: AllowedMimeType;
  byteSize: number;
  capturedAt: string;
  uploadedAt: string;
  expiresAt: string | null;
  deletedAt: string | null;
  url?: string;
}

export interface ComplaintPublic {
  id: string;
  complaintNumber: string;
  areaId: string;
  areaName?: string;
  complaintText: string;
  status: ComplaintStatus;
  submittedAt: string;
  resolvedAt: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  photo?: ComplaintPhotoPublic | null;
}

export interface ComplaintPhotoPublic {
  id: string;
  mimeType: AllowedMimeType;
  byteSize: number;
  uploadedAt: string;
  url?: string;
}

export interface HolidayPublic {
  holidayDate: string;
  name: string;
  holidayType: 'NATIONAL' | 'COLLECTIVE_LEAVE' | 'INTERNAL';
  isActive: boolean;
  source: string | null;
}

export interface AppSettingPublic {
  settingKey: string;
  settingValue: string;
  description: string | null;
}

export interface ReviewPublic {
  id: string;
  reportId: string;
  adminUserId: string;
  adminName?: string;
  decision: 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED';
  note: string | null;
  createdAt: string;
}

export interface NotificationPublic {
  id: string;
  notificationType: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
}
