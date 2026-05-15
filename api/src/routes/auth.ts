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

  // Set session cookie.
  // - Production: app (pages.dev) and API (workers.dev) live on different
  //   eTLD+1, so every fetch is cross-site. Cross-site cookies require
  //   SameSite=None; Secure or the browser refuses to send them.
  // - Local dev: both run on localhost (different ports = same site), so
  //   SameSite=Lax works and Secure must be off because the dev server
  //   speaks HTTP.
  const isHttps = new URL(c.req.url).protocol === 'https:';
  setCookie(c, COOKIE_NAME, payload.sub, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'None' : 'Lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return c.json({ id: payload.sub, email: payload.email, name: payload.name });
});

authRouter.post('/logout', (c) => {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
  return c.json({ ok: true });
});

// ── E2E backdoor ──────────────────────────────────────────────────────────────
// Lets the Playwright suite sign in without going through real Google OAuth.
// Gated by the ALLOW_TEST_SIGNIN env var; production must leave it unset.
authRouter.post('/test-signin', async (c) => {
  if (c.env.ALLOW_TEST_SIGNIN !== 'true') {
    return c.json({ error: 'Not found' }, 404);
  }
  const body = await c.req.json<{ id?: string; email?: string; name?: string }>();
  const id = body?.id ?? 'e2e-user-1';
  const email = body?.email ?? 'e2e@swimbuddy.test';
  const name = body?.name ?? 'E2E User';

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, created_at, last_seen_at)
     VALUES (?1, ?2, ?3, ?4, ?4)
     ON CONFLICT (id) DO UPDATE SET email = ?2, name = ?3, last_seen_at = ?4`,
  )
    .bind(id, email, name, now)
    .run();

  const isHttps = new URL(c.req.url).protocol === 'https:';
  setCookie(c, COOKIE_NAME, id, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'None' : 'Lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return c.json({ id, email, name });
});
