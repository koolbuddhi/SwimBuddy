import { Hono } from 'hono';
import { authRouter } from './routes/auth';
import { syncRouter } from './routes/sync';
import { accountRouter } from './routes/account';

export type Env = {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true }));
app.route('/auth', authRouter);
app.route('/sync', syncRouter);
app.route('/account', accountRouter);

export default app;
