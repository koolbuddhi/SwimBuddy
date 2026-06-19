-- Sharing: read+write share of all-my-sessions between two registered users.
-- See tasks/share-feature.md for the design.

CREATE TABLE IF NOT EXISTS shares (
  id                 TEXT PRIMARY KEY,
  owner_user_id      TEXT NOT NULL REFERENCES users(id),
  recipient_user_id  TEXT NOT NULL REFERENCES users(id),
  permission         TEXT NOT NULL,        -- 'read' | 'write'
  status             TEXT NOT NULL,        -- 'pending' | 'accepted' | 'declined' | 'revoked'
  created_at         TEXT NOT NULL,
  accepted_at        TEXT,
  revoked_at         TEXT,
  UNIQUE (owner_user_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shares_recipient ON shares(recipient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_shares_owner     ON shares(owner_user_id, status);

-- Attribution on session writes — only set when an editor that is NOT the
-- owner makes the change. Null means "owner edited it themselves".
ALTER TABLE sessions ADD COLUMN last_edited_by_user_id TEXT;
ALTER TABLE sessions ADD COLUMN last_edited_at         TEXT;
