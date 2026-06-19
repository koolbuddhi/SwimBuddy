import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env } from '../index';

export const sharesRouter = new Hono<{ Bindings: Env }>();

// ── auth middleware ────────────────────────────────────────────────────────────
sharesRouter.use('*', async (c, next) => {
  const userId = getCookie(c, 'sb_session');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  c.set('userId' as never, userId);
  await next();
});

interface ShareRow {
  id: string;
  owner_user_id: string;
  recipient_user_id: string;
  permission: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  owner_email?: string;
  owner_name?: string | null;
  recipient_email?: string;
  recipient_name?: string | null;
}

function toApi(row: ShareRow) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    recipientUserId: row.recipient_user_id,
    ownerEmail: row.owner_email,
    ownerName: row.owner_name,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    permission: row.permission,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
  };
}

// POST /shares — invite by email
sharesRouter.post('/', async (c) => {
  const userId = c.get('userId' as never) as string;
  const body = await c.req.json<{ email?: string; permission?: 'read' | 'write' }>();

  if (!body?.email || !body?.permission) {
    return c.json({ error: 'email and permission required' }, 400);
  }
  if (body.permission !== 'read' && body.permission !== 'write') {
    return c.json({ error: 'permission must be read or write' }, 400);
  }

  const normalizedEmail = body.email.trim().toLowerCase();

  const recipient = await c.env.DB.prepare(
    `SELECT id FROM users WHERE LOWER(email) = ?1`,
  )
    .bind(normalizedEmail)
    .first<{ id: string }>();

  if (!recipient) {
    return c.json({ error: 'No user found with that email' }, 404);
  }
  if (recipient.id === userId) {
    return c.json({ error: 'Cannot share with yourself' }, 400);
  }

  const existing = await c.env.DB.prepare(
    `SELECT id, status FROM shares
     WHERE owner_user_id = ?1 AND recipient_user_id = ?2`,
  )
    .bind(userId, recipient.id)
    .first<{ id: string; status: string }>();

  // Allow re-inviting after revoke/decline by reopening that row.
  if (existing && (existing.status === 'pending' || existing.status === 'accepted')) {
    return c.json({ error: 'Share already exists' }, 409);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  if (existing) {
    await c.env.DB.prepare(
      `UPDATE shares
         SET permission = ?1, status = 'pending',
             created_at = ?2, accepted_at = NULL, revoked_at = NULL
       WHERE id = ?3`,
    )
      .bind(body.permission, now, existing.id)
      .run();
    return c.json({ id: existing.id, status: 'pending' });
  }

  await c.env.DB.prepare(
    `INSERT INTO shares
       (id, owner_user_id, recipient_user_id, permission, status, created_at)
     VALUES (?1, ?2, ?3, ?4, 'pending', ?5)`,
  )
    .bind(id, userId, recipient.id, body.permission, now)
    .run();

  return c.json({ id, status: 'pending' });
});

// GET /shares — { outgoing, incoming } for the current user
sharesRouter.get('/', async (c) => {
  const userId = c.get('userId' as never) as string;

  const outgoing = await c.env.DB.prepare(
    `SELECT s.*, u.email AS recipient_email, u.name AS recipient_name
       FROM shares s
       JOIN users u ON u.id = s.recipient_user_id
      WHERE s.owner_user_id = ?1
      ORDER BY s.created_at DESC`,
  )
    .bind(userId)
    .all<ShareRow>();

  const incoming = await c.env.DB.prepare(
    `SELECT s.*, u.email AS owner_email, u.name AS owner_name
       FROM shares s
       JOIN users u ON u.id = s.owner_user_id
      WHERE s.recipient_user_id = ?1
      ORDER BY s.created_at DESC`,
  )
    .bind(userId)
    .all<ShareRow>();

  return c.json({
    outgoing: (outgoing.results ?? []).map(toApi),
    incoming: (incoming.results ?? []).map(toApi),
  });
});

// POST /shares/:id/accept — recipient only
sharesRouter.post('/:id/accept', async (c) => {
  const userId = c.get('userId' as never) as string;
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    `SELECT recipient_user_id, status FROM shares WHERE id = ?1`,
  )
    .bind(id)
    .first<{ recipient_user_id: string; status: string }>();

  if (!row) return c.json({ error: 'Not found' }, 404);
  if (row.recipient_user_id !== userId) return c.json({ error: 'Forbidden' }, 403);
  if (row.status !== 'pending') return c.json({ error: 'Share is not pending' }, 409);

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE shares SET status = 'accepted', accepted_at = ?1 WHERE id = ?2`,
  )
    .bind(now, id)
    .run();

  return c.json({ id, status: 'accepted' });
});

// POST /shares/:id/decline — recipient only
sharesRouter.post('/:id/decline', async (c) => {
  const userId = c.get('userId' as never) as string;
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    `SELECT recipient_user_id, status FROM shares WHERE id = ?1`,
  )
    .bind(id)
    .first<{ recipient_user_id: string; status: string }>();

  if (!row) return c.json({ error: 'Not found' }, 404);
  if (row.recipient_user_id !== userId) return c.json({ error: 'Forbidden' }, 403);
  if (row.status !== 'pending') return c.json({ error: 'Share is not pending' }, 409);

  await c.env.DB.prepare(
    `UPDATE shares SET status = 'declined' WHERE id = ?1`,
  )
    .bind(id)
    .run();

  return c.json({ id, status: 'declined' });
});

// DELETE /shares/:id — either side can end the share
sharesRouter.delete('/:id', async (c) => {
  const userId = c.get('userId' as never) as string;
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    `SELECT owner_user_id, recipient_user_id, status FROM shares WHERE id = ?1`,
  )
    .bind(id)
    .first<{ owner_user_id: string; recipient_user_id: string; status: string }>();

  if (!row) return c.json({ error: 'Not found' }, 404);
  if (row.owner_user_id !== userId && row.recipient_user_id !== userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const now = new Date().toISOString();
  const newStatus = row.status === 'pending' ? 'declined' : 'revoked';

  await c.env.DB.prepare(
    `UPDATE shares SET status = ?1, revoked_at = ?2 WHERE id = ?3`,
  )
    .bind(newStatus, now, id)
    .run();

  return c.json({ id, status: newStatus });
});
