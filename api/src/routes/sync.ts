import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env } from '../index';

export const syncRouter = new Hono<{ Bindings: Env }>();

// ── auth middleware ────────────────────────────────────────────────────────────
syncRouter.use('*', async (c, next) => {
  const userId = getCookie(c, 'sb_session');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  c.set('userId' as never, userId);
  await next();
});

// GET /sync — return sessions I own OR sessions shared with me (accepted)
syncRouter.get('/', async (c) => {
  const userId = c.get('userId' as never) as string;
  const rows = await c.env.DB.prepare(
    `SELECT s.id, s.user_id AS owner_id, s.date, s.notes, s.data,
            s.created_at, s.updated_at, s.client_version,
            s.last_edited_by_user_id, s.last_edited_at
       FROM sessions s
      WHERE s.deleted_at IS NULL
        AND (
          s.user_id = ?1
          OR s.user_id IN (
            SELECT owner_user_id FROM shares
             WHERE recipient_user_id = ?1 AND status = 'accepted'
          )
        )
      ORDER BY s.updated_at DESC`,
  )
    .bind(userId)
    .all();

  const sessions = rows.results.map((r) => ({
    id: r.id,
    ownerId: r.owner_id,
    date: r.date,
    notes: r.notes,
    ...(JSON.parse(r.data as string) as object),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    clientVersion: r.client_version,
    lastEditedByUserId: r.last_edited_by_user_id,
    lastEditedAt: r.last_edited_at,
  }));

  return c.json({ sessions });
});

// POST /sync — upsert a batch of sessions from the client
syncRouter.post('/', async (c) => {
  const userId = c.get('userId' as never) as string;
  const body = await c.req.json<{ mutations: Array<{
    op: 'upsert_session' | 'delete_session';
    session?: { id: string; date: string; notes: string; drills: unknown[]; groups: unknown[]; createdAt: string; updatedAt: string };
    sessionId?: string;
    clientVersion?: number;
  }> }>();

  if (!Array.isArray(body?.mutations)) {
    return c.json({ error: 'mutations array required' }, 400);
  }

  const now = new Date().toISOString();
  const rejected: Array<{ id: string; reason: string }> = [];

  for (const mutation of body.mutations) {
    if (mutation.op === 'upsert_session' && mutation.session) {
      const s = mutation.session;

      // Look up existing owner — if the row exists, the upsert must respect
      // its ownership. If not, the writer becomes the owner.
      const existing = await c.env.DB.prepare(
        `SELECT user_id FROM sessions WHERE id = ?1`,
      )
        .bind(s.id)
        .first<{ user_id: string }>();

      let ownerId = userId;
      if (existing) {
        ownerId = existing.user_id;
        if (existing.user_id !== userId) {
          // Not the owner — need an accepted write share.
          const share = await c.env.DB.prepare(
            `SELECT id FROM shares
              WHERE owner_user_id = ?1 AND recipient_user_id = ?2
                AND status = 'accepted' AND permission = 'write'`,
          )
            .bind(existing.user_id, userId)
            .first<{ id: string }>();
          if (!share) {
            rejected.push({ id: s.id, reason: 'forbidden' });
            continue;
          }
        }
      }

      const data = JSON.stringify({ drills: s.drills, groups: s.groups });
      const lastEditedBy = ownerId === userId ? null : userId;

      await c.env.DB.prepare(
        `INSERT INTO sessions
           (id, user_id, date, notes, data, created_at, updated_at,
            client_version, last_edited_by_user_id, last_edited_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT (id) DO UPDATE SET
           date = ?3, notes = ?4, data = ?5, updated_at = ?7,
           client_version = ?8,
           last_edited_by_user_id = ?9,
           last_edited_at = ?10`,
      )
        .bind(
          s.id,
          ownerId,
          s.date,
          s.notes,
          data,
          s.createdAt,
          now,
          mutation.clientVersion ?? 0,
          lastEditedBy,
          lastEditedBy ? now : null,
        )
        .run();
    } else if (mutation.op === 'delete_session' && mutation.sessionId) {
      // Only the owner can delete. (Write-share collaborators can edit but not
      // permanently remove someone else's session — feels right for v1.)
      await c.env.DB.prepare(
        `UPDATE sessions SET deleted_at = ?1 WHERE id = ?2 AND user_id = ?3`,
      )
        .bind(now, mutation.sessionId, userId)
        .run();
    }
  }

  return c.json({ ok: true, syncedAt: now, rejected });
});
