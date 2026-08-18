CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_iterations INTEGER NOT NULL CHECK (password_iterations >= 100000),
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CS')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
    display_order INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_areas_active_order
    ON areas(is_active, display_order);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    report_number TEXT NOT NULL COLLATE NOCASE UNIQUE,
    user_id TEXT NOT NULL,
    area_id TEXT NOT NULL,
    reporter_name TEXT NOT NULL,
    reporter_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT',
            'SUBMITTED',
            'REVISION_REQUIRED',
            'RESUBMITTED',
            'APPROVED',
            'REJECTED'
        )),
    before_captured_at TEXT,
    after_captured_at TEXT,
    submitted_at TEXT,
    approved_at TEXT,
    rejected_at TEXT,
    admin_note TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_reports_user_status
    ON reports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_area_submitted
    ON reports(area_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_reports_status_submitted
    ON reports(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_reports_user_submitted
    ON reports(user_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    photo_type TEXT NOT NULL CHECK (photo_type IN ('BEFORE', 'AFTER')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
    r2_object_key TEXT NOT NULL UNIQUE,
    original_filename TEXT,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/webp', 'image/jpeg', 'image/png')),
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    checksum_sha256 TEXT,
    captured_at TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    expires_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (report_id, photo_type, version)
);

CREATE INDEX IF NOT EXISTS idx_photos_report_id ON photos(report_id);
CREATE INDEX IF NOT EXISTS idx_photos_expiry ON photos(expires_at, deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_one_current_per_type
    ON photos(report_id, photo_type)
    WHERE is_current = 1 AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    admin_user_id TEXT NOT NULL,
    decision TEXT NOT NULL
        CHECK (decision IN ('APPROVED', 'REVISION_REQUIRED', 'REJECTED')),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (decision = 'APPROVED' OR length(trim(coalesce(note, ''))) > 0)
);

CREATE INDEX IF NOT EXISTS idx_reviews_report_created
    ON reviews(report_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_entity_type TEXT,
    related_entity_id TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS holidays (
    holiday_date TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    holiday_type TEXT NOT NULL CHECK (holiday_type IN ('NATIONAL', 'COLLECTIVE_LEAVE', 'INTERNAL')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    source TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_holidays_active_date
    ON holidays(is_active, holiday_date);

CREATE TABLE IF NOT EXISTS reminder_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    inactivity_key TEXT NOT NULL,
    last_submitted_at TEXT,
    working_days_inactive INTEGER NOT NULL CHECK (working_days_inactive >= 3),
    recipient_email TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (user_id, inactivity_key)
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_sent
    ON reminder_logs(user_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    complaint_number TEXT NOT NULL COLLATE NOCASE UNIQUE,
    area_id TEXT NOT NULL,
    complaint_text TEXT NOT NULL CHECK (length(trim(complaint_text)) > 0),
    status TEXT NOT NULL DEFAULT 'NEW'
        CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')),
    submitted_at TEXT NOT NULL,
    resolved_at TEXT,
    admin_note TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (area_id) REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_complaints_status_submitted
    ON complaints(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_area_submitted
    ON complaints(area_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS complaint_photos (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL,
    r2_object_key TEXT NOT NULL UNIQUE,
    original_filename TEXT,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/webp', 'image/jpeg', 'image/png')),
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    checksum_sha256 TEXT,
    uploaded_at TEXT NOT NULL,
    expires_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_complaint_photos_complaint
    ON complaint_photos(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_photos_expiry
    ON complaint_photos(expires_at, deleted_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CHECK (details_json IS NULL OR json_valid(details_json))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
    ON audit_logs(actor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
