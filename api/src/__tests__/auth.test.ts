import app from '../index';

// ── mock jose ─────────────────────────────────────────────────────────────────
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

const { jwtVerify: mockJwtVerify } = jest.requireMock('jose') as {
  jwtVerify: jest.Mock;
};

// ── mock D1 ───────────────────────────────────────────────────────────────────
const mockPrepare = jest.fn();
const mockBind = jest.fn();
const mockRun = jest.fn();

mockPrepare.mockReturnValue({ bind: mockBind });
mockBind.mockReturnValue({ run: mockRun });
mockRun.mockResolvedValue({});

const mockEnv = {
  DB: { prepare: mockPrepare } as unknown as D1Database,
  GOOGLE_CLIENT_ID: 'test-client-id',
};

const post = (urlOrPath: string, body: unknown) =>
  app.request(urlOrPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, mockEnv);

// ── tests ─────────────────────────────────────────────────────────────────────
describe('POST /auth/google', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepare.mockReturnValue({ bind: mockBind });
    mockBind.mockReturnValue({ run: mockRun });
    mockRun.mockResolvedValue({});
  });

  it('returns 400 when idToken is missing', async () => {
    const res = await post('/auth/google', {});
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/idToken/);
  });

  it('returns 401 when token verification fails', async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error('invalid token'));
    const res = await post('/auth/google', { idToken: 'bad-token' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with user info and sets cookie on valid token', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'google-uid-123', email: 'coach@example.com', name: 'Coach Joe' },
    });
    const res = await post('/auth/google', { idToken: 'valid-token' });
    expect(res.status).toBe(200);
    const body = await res.json() as { id: string; email: string; name: string };
    expect(body.id).toBe('google-uid-123');
    expect(body.email).toBe('coach@example.com');
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toMatch(/sb_session/);
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it('upserts user in D1 on valid token', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'google-uid-123', email: 'coach@example.com', name: 'Coach Joe' },
    });
    await post('/auth/google', { idToken: 'valid-token' });
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'));
    expect(mockBind).toHaveBeenCalledWith('google-uid-123', 'coach@example.com', 'Coach Joe', expect.any(String));
  });

  // Regression: production app + API live on different eTLD+1 (pages.dev vs
  // workers.dev), so every /sync fetch is cross-site. SameSite=Lax cookies
  // are NOT sent on cross-site fetches → /sync would 401 forever. The cookie
  // must be SameSite=None; Secure when set over HTTPS.
  it('sets SameSite=None; Secure when request is over HTTPS (cross-site prod)', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'u1', email: 'a@b.com', name: 'A' },
    });
    const res = await post('https://api.example.com/auth/google', { idToken: 'ok' });
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/SameSite=None/i);
    expect(setCookie).toMatch(/Secure/i);
  });

  it('sets SameSite=Lax (no Secure) when request is over HTTP (local dev)', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'u1', email: 'a@b.com', name: 'A' },
    });
    const res = await post('http://localhost/auth/google', { idToken: 'ok' });
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).not.toMatch(/Secure/i);
  });
});

describe('POST /auth/logout', () => {
  it('returns 200 and clears cookie', async () => {
    const res = await post('/auth/logout', {});
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
    const setCookie = res.headers.get('set-cookie');
    // cookie cleared means Max-Age=0 or expires in the past
    expect(setCookie).toMatch(/sb_session/);
  });
});
