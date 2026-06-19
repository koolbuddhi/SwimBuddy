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

function resetMocks() {
  mockPrepare.mockReset();
  mockBind.mockReset();
  mockRun.mockReset();
  mockAll.mockReset();
  mockFirst.mockReset();

  mockPrepare.mockReturnValue({ bind: mockBind });
  mockBind.mockReturnValue({ run: mockRun, all: mockAll, first: mockFirst });
  mockRun.mockResolvedValue({});
  mockAll.mockResolvedValue({ results: [] });
  mockFirst.mockResolvedValue(null);
}

const mockEnv = {
  DB: { prepare: mockPrepare } as unknown as D1Database,
  GOOGLE_CLIENT_ID: 'test-client-id',
};

const reqWithSession = (path: string, init: RequestInit = {}) =>
  app.request(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'sb_session=user-me',
      ...(init.headers as Record<string, string> | undefined),
    },
  }, mockEnv);

beforeEach(() => {
  resetMocks();
});

// ── POST /shares ──────────────────────────────────────────────────────────────
describe('POST /shares', () => {
  it('returns 401 without session cookie', async () => {
    const res = await app.request('/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x@y.com', permission: 'write' }),
    }, mockEnv);
    expect(res.status).toBe(401);
  });

  it('returns 400 when email or permission missing', async () => {
    const r1 = await reqWithSession('/shares', { method: 'POST', body: JSON.stringify({}) });
    expect(r1.status).toBe(400);
    const r2 = await reqWithSession('/shares', { method: 'POST', body: JSON.stringify({ email: 'a@b.com' }) });
    expect(r2.status).toBe(400);
  });

  it('returns 400 for an invalid permission value', async () => {
    const res = await reqWithSession('/shares', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', permission: 'owner' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when no user matches the email', async () => {
    mockFirst.mockResolvedValueOnce(null);
    const res = await reqWithSession('/shares', {
      method: 'POST',
      body: JSON.stringify({ email: 'unknown@example.com', permission: 'write' }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects sharing with yourself', async () => {
    mockFirst.mockResolvedValueOnce({ id: 'user-me' });
    const res = await reqWithSession('/shares', {
      method: 'POST',
      body: JSON.stringify({ email: 'me@swimbuddy.test', permission: 'write' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when a pending share already exists between the pair', async () => {
    mockFirst
      .mockResolvedValueOnce({ id: 'user-other' })
      .mockResolvedValueOnce({ id: 'share-1', status: 'pending' });
    const res = await reqWithSession('/shares', {
      method: 'POST',
      body: JSON.stringify({ email: 'other@swimbuddy.test', permission: 'write' }),
    });
    expect(res.status).toBe(409);
  });

  it('creates a pending share when the recipient exists and there is no prior share', async () => {
    mockFirst
      .mockResolvedValueOnce({ id: 'user-other' })  // recipient lookup
      .mockResolvedValueOnce(null);                  // existing-share lookup
    const res = await reqWithSession('/shares', {
      method: 'POST',
      body: JSON.stringify({ email: 'other@swimbuddy.test', permission: 'write' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('pending');
  });

  it('reopens a previously declined/revoked share by re-binding into pending', async () => {
    mockFirst
      .mockResolvedValueOnce({ id: 'user-other' })
      .mockResolvedValueOnce({ id: 'old-share', status: 'revoked' });
    const res = await reqWithSession('/shares', {
      method: 'POST',
      body: JSON.stringify({ email: 'other@swimbuddy.test', permission: 'read' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { id: string; status: string };
    expect(body.id).toBe('old-share');
    expect(body.status).toBe('pending');
  });
});

// ── GET /shares ───────────────────────────────────────────────────────────────
describe('GET /shares', () => {
  it('returns 401 without session cookie', async () => {
    const res = await app.request('/shares', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(401);
  });

  it('returns outgoing and incoming arrays', async () => {
    mockAll
      .mockResolvedValueOnce({ results: [{
        id: 's1', owner_user_id: 'user-me', recipient_user_id: 'b',
        permission: 'write', status: 'accepted', created_at: 't',
        accepted_at: 't', revoked_at: null,
        recipient_email: 'b@x', recipient_name: 'B',
      }]})
      .mockResolvedValueOnce({ results: [{
        id: 's2', owner_user_id: 'c', recipient_user_id: 'user-me',
        permission: 'read', status: 'pending', created_at: 't',
        accepted_at: null, revoked_at: null,
        owner_email: 'c@x', owner_name: 'C',
      }]});

    const res = await reqWithSession('/shares', { method: 'GET' });
    expect(res.status).toBe(200);
    const body = await res.json() as { outgoing: unknown[]; incoming: unknown[] };
    expect(body.outgoing).toHaveLength(1);
    expect(body.incoming).toHaveLength(1);
  });
});

// ── POST /shares/:id/accept ───────────────────────────────────────────────────
describe('POST /shares/:id/accept', () => {
  it('returns 404 when share does not exist', async () => {
    mockFirst.mockResolvedValueOnce(null);
    const res = await reqWithSession('/shares/x/accept', { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is not the recipient', async () => {
    mockFirst.mockResolvedValueOnce({ recipient_user_id: 'someone-else', status: 'pending' });
    const res = await reqWithSession('/shares/x/accept', { method: 'POST' });
    expect(res.status).toBe(403);
  });

  it('returns 409 when share is not pending', async () => {
    mockFirst.mockResolvedValueOnce({ recipient_user_id: 'user-me', status: 'accepted' });
    const res = await reqWithSession('/shares/x/accept', { method: 'POST' });
    expect(res.status).toBe(409);
  });

  it('accepts a pending share', async () => {
    mockFirst.mockResolvedValueOnce({ recipient_user_id: 'user-me', status: 'pending' });
    const res = await reqWithSession('/shares/x/accept', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('accepted');
  });
});

// ── POST /shares/:id/decline ──────────────────────────────────────────────────
describe('POST /shares/:id/decline', () => {
  it('only the recipient can decline', async () => {
    mockFirst.mockResolvedValueOnce({ recipient_user_id: 'someone-else', status: 'pending' });
    const res = await reqWithSession('/shares/x/decline', { method: 'POST' });
    expect(res.status).toBe(403);
  });

  it('declines a pending share', async () => {
    mockFirst.mockResolvedValueOnce({ recipient_user_id: 'user-me', status: 'pending' });
    const res = await reqWithSession('/shares/x/decline', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('declined');
  });
});

// ── DELETE /shares/:id ────────────────────────────────────────────────────────
describe('DELETE /shares/:id', () => {
  it('returns 404 when share does not exist', async () => {
    mockFirst.mockResolvedValueOnce(null);
    const res = await reqWithSession('/shares/x', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is neither owner nor recipient', async () => {
    mockFirst.mockResolvedValueOnce({
      owner_user_id: 'a', recipient_user_id: 'b', status: 'accepted',
    });
    const res = await reqWithSession('/shares/x', { method: 'DELETE' });
    expect(res.status).toBe(403);
  });

  it('owner can revoke an accepted share', async () => {
    mockFirst.mockResolvedValueOnce({
      owner_user_id: 'user-me', recipient_user_id: 'b', status: 'accepted',
    });
    const res = await reqWithSession('/shares/x', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('revoked');
  });

  it('recipient can decline a still-pending share via DELETE', async () => {
    mockFirst.mockResolvedValueOnce({
      owner_user_id: 'a', recipient_user_id: 'user-me', status: 'pending',
    });
    const res = await reqWithSession('/shares/x', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('declined');
  });
});
