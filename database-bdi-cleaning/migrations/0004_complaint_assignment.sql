PRAGMA foreign_keys = OFF;

CREATE TABLE complaints_new (
    id TEXT PRIMARY KEY,

    complaint_number TEXT NOT NULL
        COLLATE NOCASE
        UNIQUE,

    area_id TEXT NOT NULL,

    -- CS yang saat ini bertanggung jawab menangani pengaduan.
    -- NULL diperbolehkan sebagai fallback jika area belum memiliki assignment.
    assigned_user_id TEXT,

    complaint_text TEXT NOT NULL
        CHECK (length(trim(complaint_text)) > 0),

    status TEXT NOT NULL DEFAULT 'NEW'
        CHECK (
            status IN (
                'NEW',
                'IN_PROGRESS',
                'WAITING_VERIFICATION',
                'RESOLVED',
                'REJECTED'
            )
        ),

    submitted_at TEXT NOT NULL,

    -- Waktu sistem/admin menetapkan CS.
    assigned_at TEXT,

    -- Waktu CS mulai menangani pengaduan.
    started_at TEXT,

    -- Waktu CS menyatakan pekerjaan selesai.
    waiting_verification_at TEXT,

    -- Waktu admin memverifikasi selesai.
    resolved_at TEXT,

    admin_note TEXT,

    created_at TEXT NOT NULL
        DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    updated_at TEXT NOT NULL
        DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    FOREIGN KEY (area_id)
        REFERENCES areas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (assigned_user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

INSERT INTO complaints_new (
    id,
    complaint_number,
    area_id,
    complaint_text,
    status,
    submitted_at,
    resolved_at,
    admin_note,
    created_at,
    updated_at
)
SELECT
    id,
    complaint_number,
    area_id,
    complaint_text,
    status,
    submitted_at,
    resolved_at,
    admin_note,
    created_at,
    updated_at
FROM complaints;

DROP TABLE complaints;

ALTER TABLE complaints_new
RENAME TO complaints;

CREATE INDEX IF NOT EXISTS idx_complaints_status_submitted
    ON complaints(status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaints_area_submitted
    ON complaints(area_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaints_assigned_user_status
    ON complaints(
        assigned_user_id,
        status,
        submitted_at DESC
    );

PRAGMA foreign_keys = ON;