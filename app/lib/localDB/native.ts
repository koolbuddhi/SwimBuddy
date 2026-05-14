import * as SQLite from 'expo-sqlite';
import type { Session, Meta, MutationOp, MutationQueueEntry, LocalDB } from '../types';

const DEFAULT_META: Meta = {
  lastSyncedAt: null,
  userId: null,
  userEmail: null,
  userName: null,
};

const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,
    data       TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mutation_queue (
    id       TEXT PRIMARY KEY,
    op_json  TEXT NOT NULL,
    ts       TEXT NOT NULL,
    retries  INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

let _db: SQLite.SQLiteDatabase | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('swimbuddy.db');
  await _db.execAsync(CREATE_TABLES);
  return _db;
}

export const nativeDB: LocalDB = {
  async getSessions(): Promise<Session[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<{ id: string; date: string; data: string }>(
      'SELECT id, date, data FROM sessions ORDER BY date DESC',
    );
    return rows.map((r) => JSON.parse(r.data) as Session);
  },

  async getSession(id: string): Promise<Session | undefined> {
    const db = await getDB();
    const row = await db.getFirstAsync<{ data: string }>(
      'SELECT data FROM sessions WHERE id = ?',
      [id],
    );
    return row ? (JSON.parse(row.data) as Session) : undefined;
  },

  async putSession(session: Session): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'INSERT OR REPLACE INTO sessions (id, date, data) VALUES (?, ?, ?)',
      [session.id, session.date, JSON.stringify(session)],
    );
  },

  async deleteSession(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
  },

  async queueMutation(op: MutationOp): Promise<void> {
    const db = await getDB();
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO mutation_queue (id, op_json, ts, retries) VALUES (?, ?, ?, 0)',
      [id, JSON.stringify(op), ts],
    );
  },

  async getPendingMutations(): Promise<MutationQueueEntry[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<{ id: string; op_json: string; ts: string; retries: number }>(
      'SELECT id, op_json, ts, retries FROM mutation_queue ORDER BY ts ASC',
    );
    return rows.map((r) => ({
      id: r.id,
      op: JSON.parse(r.op_json) as MutationOp,
      ts: r.ts,
      retries: r.retries,
    }));
  },

  async clearMutation(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync('DELETE FROM mutation_queue WHERE id = ?', [id]);
  },

  async getMeta(): Promise<Meta> {
    const db = await getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'singleton'",
    );
    if (!row) return { ...DEFAULT_META };
    return JSON.parse(row.value) as Meta;
  },

  async setMeta(patch: Partial<Meta>): Promise<void> {
    const db = await getDB();
    const current = await nativeDB.getMeta();
    const updated = { ...current, ...patch };
    await db.runAsync(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('singleton', ?)",
      [JSON.stringify(updated)],
    );
  },
};
