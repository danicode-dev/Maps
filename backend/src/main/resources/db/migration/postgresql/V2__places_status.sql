-- PostgreSQL version
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS status place_visit_status NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS visited_at TIMESTAMP NULL;
