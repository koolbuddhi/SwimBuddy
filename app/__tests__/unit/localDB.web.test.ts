/**
 * Tests for the Dexie (IndexedDB) implementation of LocalDB.
 * Uses fake-indexeddb so tests run in Node without a browser.
 */
import 'fake-indexeddb/auto';
import { SwimBuddyDB, createWebDB } from '../../lib/localDB/web';
import type { Session, MutationOp } from '../../lib/types';

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-1',
  date: '2026-05-13',
  notes: '',
  drills: [],
  groups: [],
  createdAt: '2026-05-13T10:00:00.000Z',
  updatedAt: '2026-05-13T10:00:00.000Z',
  ...overrides,
});

let db: SwimBuddyDB;

beforeEach(() => {
  // Fresh DB instance per test (fake-indexeddb isolates state)
  db = createWebDB();
});

afterEach(async () => {
  await db.delete();
});

describe('sessions table', () => {
  it('returns empty array when no sessions exist', async () => {
    const all = await db.getSessions();
    expect(all).toEqual([]);
  });

  it('putSession stores a session; getSessions returns it', async () => {
    const s = makeSession();
    await db.putSession(s);
    const all = await db.getSessions();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('test-session-1');
  });

  it('getSession returns the session by id', async () => {
    const s = makeSession();
    await db.putSession(s);
    const found = await db.getSession('test-session-1');
    expect(found).toBeDefined();
    expect(found?.date).toBe('2026-05-13');
  });

  it('getSession returns undefined for unknown id', async () => {
    const found = await db.getSession('nonexistent');
    expect(found).toBeUndefined();
  });

  it('putSession updates an existing session (upsert)', async () => {
    const s = makeSession();
    await db.putSession(s);
    await db.putSession({ ...s, notes: 'updated' });
    const all = await db.getSessions();
    expect(all).toHaveLength(1);
    expect(all[0].notes).toBe('updated');
  });

  it('deleteSession removes the session', async () => {
    const s = makeSession();
    await db.putSession(s);
    await db.deleteSession('test-session-1');
    const all = await db.getSessions();
    expect(all).toHaveLength(0);
  });

  it('getSessions returns sessions sorted by date descending', async () => {
    await db.putSession(makeSession({ id: 's1', date: '2026-05-10' }));
    await db.putSession(makeSession({ id: 's2', date: '2026-05-13' }));
    await db.putSession(makeSession({ id: 's3', date: '2026-05-11' }));
    const all = await db.getSessions();
    expect(all.map((s) => s.id)).toEqual(['s2', 's3', 's1']);
  });
});

describe('mutation_queue table', () => {
  const op: MutationOp = {
    op: 'upsert_session',
    session: makeSession(),
    clientVersion: 0,
  };

  it('getPendingMutations returns empty array initially', async () => {
    expect(await db.getPendingMutations()).toEqual([]);
  });

  it('queueMutation appends an entry', async () => {
    await db.queueMutation(op);
    const pending = await db.getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(pending[0].op.op).toBe('upsert_session');
  });

  it('clearMutation removes the entry by id', async () => {
    await db.queueMutation(op);
    const [entry] = await db.getPendingMutations();
    await db.clearMutation(entry.id);
    expect(await db.getPendingMutations()).toHaveLength(0);
  });

  it('deleteSession does not affect mutation_queue', async () => {
    await db.putSession(makeSession());
    await db.queueMutation(op);
    await db.deleteSession('test-session-1');
    expect(await db.getPendingMutations()).toHaveLength(1);
  });
});

describe('meta table', () => {
  it('getMeta returns null defaults on first run', async () => {
    const meta = await db.getMeta();
    expect(meta.lastSyncedAt).toBeNull();
    expect(meta.userId).toBeNull();
    expect(meta.userEmail).toBeNull();
    expect(meta.userName).toBeNull();
  });

  it('setMeta merges a partial update', async () => {
    await db.setMeta({ userId: 'u1', userEmail: 'test@example.com' });
    const meta = await db.getMeta();
    expect(meta.userId).toBe('u1');
    expect(meta.userEmail).toBe('test@example.com');
    expect(meta.lastSyncedAt).toBeNull(); // untouched
  });

  it('setMeta does not overwrite unrelated fields', async () => {
    await db.setMeta({ userId: 'u1' });
    await db.setMeta({ lastSyncedAt: '2026-05-13T12:00:00.000Z' });
    const meta = await db.getMeta();
    expect(meta.userId).toBe('u1');
    expect(meta.lastSyncedAt).toBe('2026-05-13T12:00:00.000Z');
  });
});
