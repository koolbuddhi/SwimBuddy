-- SwimBuddy v1.0 initial schema

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,           -- Google `sub` claim
  email       TEXT NOT NULL,
  name        TEXT,
  created_at  TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT PRIMARY KEY,        -- client-generated UUID
  user_id        TEXT NOT NULL REFERENCES users(id),
  date           TEXT NOT NULL,           -- YYYY-MM-DD (device-local)
  notes          TEXT NOT NULL DEFAULT '',
  data           TEXT NOT NULL,           -- JSON: {drills:[...], groups:[...]}
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT,                    -- soft delete for sync safety
  client_version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_updated ON sessions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date    ON sessions(user_id, date DESC);
