// mock jose so the auth router (imported transitively) can load
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

import app from '../index';

// ── mock D1 ───────────────────────────────────────────────────────────────────
const mockPrepare = jest.fn();
const mockBind = jest.fn();
const mockRun = jest.fn();
const mockAll = jest.fn();
const mockFirst = jest.fn();

mockPrepare.mockReturnValue({ bind: mockBind });
mockBind.mockReturnValue({ run: mockRun, all: mockAll, first: mockFirst });
mockRun.mockResolvedValue({});
mockAll.mockResolvedValue({ results: [] });
mockFirst.mockResolvedValue(null);

const mockEnv = {
  DB: { prepare: mockPrepare } as unknown as D1Database,
  GOOGLE_CLIENT_ID: 'test-client-id',
};

const getWithSession = (path: string) =>
  app.request(path, {
    method: 'GET',
    headers: { Cookie: 'sb_session=user-123' },
  }, mockEnv);

const postWithSession = (path: string, body: unknown) =>
  app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'sb_session=user-123' },
    body: JSON.stringify(body),
  }, mockEnv);

beforeEach(() => {
  jest.clearAllMocks();
  mockPrepare.mockReturnValue({ bind: mockBind });
  mockBind.mockReturnValue({ run: mockRun, all: mockAll, first: mockFirst });
  mockRun.mockResolvedValue({});
  mockAll.mockResolvedValue({ results: [] });
  mockFirst.mockResolvedValue(null);
});

describe('GET /sync', () => {
  it('returns 401 without session cookie', async () => {
    const res = await app.request('/sync', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(401);
  });

  it('returns sessions array with valid cookie', async () => {
    mockAll.mockResolvedValueOnce({ results: [] });
    const res = await getWithSession('/sync');
    expect(res.status).toBe(200);
    const body = await res.json() as { sessions: unknown[] };
    expect(Array.isArray(body.sessions)).toBe(true);
  });

  it('queries D1 for the authenticated user', async () => {
    await getWithSession('/sync');
    expect(mockBind).toHaveBeenCalledWith('user-123');
  });
});

describe('POST /sync', () => {
  it('returns 401 without session cookie', async () => {
    const res = await app.request('/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: [] }),
    }, mockEnv);
    expect(res.status).toBe(401);
  });

  it('returns 400 when mutations is missing', async () => {
    const res = await postWithSession('/sync', {});
    expect(res.status).toBe(400);
  });

  it('upserts a session on upsert_session mutation', async () => {
    const session = {
      id: 's1', date: '2026-05-13', notes: '', drills: [], groups: [],
      createdAt: '2026-05-13T10:00:00Z', updatedAt: '2026-05-13T10:00:00Z',
    };
    const res = await postWithSession('/sync', {
      mutations: [{ op: 'upsert_session', session, clientVersion: 1 }],
    });
    expect(res.status).toBe(200);
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO sessions'));
  });

  it('soft-deletes a session on delete_session mutation', async () => {
    const res = await postWithSession('/sync', {
      mutations: [{ op: 'delete_session', sessionId: 's1' }],
    });
    expect(res.status).toBe(200);
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('deleted_at'));
  });

  it('returns syncedAt timestamp', async () => {
    const res = await postWithSession('/sync', { mutations: [] });
    expect(res.status).toBe(200);
    const body = await res.json() as { syncedAt: string };
    expect(body.syncedAt).toBeTruthy();
  });

  it('allows a non-owner write when an accepted write-share exists', async () => {
    mockFirst
      .mockResolvedValueOnce({ user_id: 'someone-else' })  // existing session lookup
      .mockResolvedValueOnce({ id: 'share-1' });           // share lookup
    const session = {
      id: 's1', date: '2026-05-13', notes: '', drills: [], groups: [],
      createdAt: '2026-05-13T10:00:00Z', updatedAt: '2026-05-13T10:00:00Z',
    };
    const res = await postWithSession('/sync', {
      mutations: [{ op: 'upsert_session', session, clientVersion: 1 }],
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { rejected: unknown[] };
    expect(body.rejected).toEqual([]);
  });

  it('rejects a non-owner write when no accepted write-share exists', async () => {
    mockFirst
      .mockResolvedValueOnce({ user_id: 'someone-else' })  // existing session lookup
      .mockResolvedValueOnce(null);                         // no share
    const session = {
      id: 's1', date: '2026-05-13', notes: '', drills: [], groups: [],
      createdAt: '2026-05-13T10:00:00Z', updatedAt: '2026-05-13T10:00:00Z',
    };
    const res = await postWithSession('/sync', {
      mutations: [{ op: 'upsert_session', session, clientVersion: 1 }],
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { rejected: Array<{ id: string; reason: string }> };
    expect(body.rejected).toEqual([{ id: 's1', reason: 'forbidden' }]);
  });

  it('GET /sync joins shared-with-me sessions via the shares table', async () => {
    await getWithSession('/sync');
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('FROM shares'));
  });
});
