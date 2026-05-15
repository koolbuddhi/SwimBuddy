import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { verifyGoogleToken } from '../auth/google';
import type { Env } from '../index';

export const authRouter = new Hono<{ Bindings: Env }>();

const COOKIE_NAME = 'sb_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

authRouter.post('/google', async (c) => {
  const body = await c.req.json<{ idToken?: string }>();
  if (!body?.idToken) {
    return c.json({ error: 'idToken required' }, 400);
  }

  const audience = c.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    return c.json({ error: 'Server misconfigured' }, 500);
  }

  let payload;
  try {
    payload = await verifyGoogleToken(body.idToken, audience);
  } catch (e) {
    // Surface the underlying jose error in dev so misconfigurations
    // (audience mismatch, missing env var, etc.) are easy to spot.
    return c.json({ error: 'Invalid token', detail: e instanceof Error ? e.message : String(e) }, 401);
  }

  const now = new Date().toISOString();

  // Upsert user in D1
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, created_at, last_seen_at)
     VALUES (?1, ?2, ?3, ?4, ?4)
     ON CONFLICT (id) DO UPDATE SET email = ?2, name = ?3, last_seen_at = ?4`,
  )
    .bind(payload.sub, payload.email, payload.name, now)
    .run();

  // Set session cookie. SameSite=Lax keeps the cookie scoped to first-party
  // and same-site contexts (localhost:8081 ↔ localhost:8787 are same-site).
  // For true cross-site prod deployments, switch to SameSite=None; Secure.
  const isHttps = new URL(c.req.url).protocol === 'https:';
  setCookie(c, COOKIE_NAME, payload.sub, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'Lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return c.json({ id: payload.sub, email: payload.email, name: payload.name });
});

authRouter.post('/logout', (c) => {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
  return c.json({ ok: true });
});
