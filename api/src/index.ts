import { Hono } from 'hono';
import { authRouter } from './routes/auth';

export type Env = {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true }));
app.route('/auth', authRouter);

export default app;
