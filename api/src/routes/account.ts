import { Hono } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import type { Env } from '../index';

export const accountRouter = new Hono<{ Bindings: Env }>();

accountRouter.delete('/', async (c) => {
  const userId = getCookie(c, 'sb_session');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const now = new Date().toISOString();

  // Soft-delete all sessions
  await c.env.DB.prepare(
    `UPDATE sessions SET deleted_at = ?1 WHERE user_id = ?2 AND deleted_at IS NULL`,
  )
    .bind(now, userId)
    .run();

  // Delete the user record
  await c.env.DB.prepare(`DELETE FROM users WHERE id = ?1`)
    .bind(userId)
    .run();

  deleteCookie(c, 'sb_session', { path: '/' });

  return c.json({ ok: true });
});
