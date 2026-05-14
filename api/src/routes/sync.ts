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

// GET /sync — return all non-deleted sessions for the user
syncRouter.get('/', async (c) => {
  const userId = c.get('userId' as never) as string;
  const rows = await c.env.DB.prepare(
    `SELECT id, date, notes, data, created_at, updated_at, client_version
     FROM sessions WHERE user_id = ?1 AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
  )
    .bind(userId)
    .all();

  const sessions = rows.results.map((r) => ({
    id: r.id,
    date: r.date,
    notes: r.notes,
    ...(JSON.parse(r.data as string) as object),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    clientVersion: r.client_version,
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

  for (const mutation of body.mutations) {
    if (mutation.op === 'upsert_session' && mutation.session) {
      const s = mutation.session;
      const data = JSON.stringify({ drills: s.drills, groups: s.groups });
      await c.env.DB.prepare(
        `INSERT INTO sessions (id, user_id, date, notes, data, created_at, updated_at, client_version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT (id) DO UPDATE SET
           date = ?3, notes = ?4, data = ?5, updated_at = ?7, client_version = ?8
         WHERE user_id = ?2`,
      )
        .bind(s.id, userId, s.date, s.notes, data, s.createdAt, now, mutation.clientVersion ?? 0)
        .run();
    } else if (mutation.op === 'delete_session' && mutation.sessionId) {
      await c.env.DB.prepare(
        `UPDATE sessions SET deleted_at = ?1 WHERE id = ?2 AND user_id = ?3`,
      )
        .bind(now, mutation.sessionId, userId)
        .run();
    }
  }

  return c.json({ ok: true, syncedAt: now });
});
