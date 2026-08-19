CREATE TABLE area_assignments (
  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,
  area_id TEXT NOT NULL,

  assigned_from TEXT NOT NULL,
  assigned_until TEXT,

  is_active INTEGER NOT NULL DEFAULT 1,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (area_id) REFERENCES areas(id)
);

CREATE INDEX idx_area_assignments_user
ON area_assignments(user_id);

CREATE INDEX idx_area_assignments_area
ON area_assignments(area_id);

CREATE INDEX idx_area_assignments_active
ON area_assignments(is_active);