import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth';
import { syncRouter } from './routes/sync';
import { accountRouter } from './routes/account';

export type Env = {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  ALLOWED_ORIGINS?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? 'http://localhost:8081').split(',').map((s) => s.trim());
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next);
});

app.get('/health', (c) => c.json({ ok: true }));
app.route('/auth', authRouter);
app.route('/sync', syncRouter);
app.route('/account', accountRouter);

export default app;
