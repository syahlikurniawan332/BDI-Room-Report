ALTER TABLE complaint_photos
ADD COLUMN photo_type TEXT NOT NULL DEFAULT 'SUBMISSION'
CHECK (photo_type IN ('SUBMISSION', 'COMPLETION_EVIDENCE'));

CREATE INDEX IF NOT EXISTS idx_complaint_photos_type
    ON complaint_photos(complaint_id, photo_type, deleted_at);
