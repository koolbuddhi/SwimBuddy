jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

import app from '../index';

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

beforeEach(() => {
  jest.clearAllMocks();
  mockPrepare.mockReturnValue({ bind: mockBind });
  mockBind.mockReturnValue({ run: mockRun });
  mockRun.mockResolvedValue({});
});

describe('DELETE /account', () => {
  it('returns 401 without session cookie', async () => {
    const res = await app.request('/account', { method: 'DELETE' }, mockEnv);
    expect(res.status).toBe(401);
  });

  it('soft-deletes sessions and removes user', async () => {
    const res = await app.request('/account', {
      method: 'DELETE',
      headers: { Cookie: 'sb_session=user-123' },
    }, mockEnv);
    expect(res.status).toBe(200);
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('deleted_at'));
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM users'));
  });

  it('clears session cookie on success', async () => {
    const res = await app.request('/account', {
      method: 'DELETE',
      headers: { Cookie: 'sb_session=user-123' },
    }, mockEnv);
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toMatch(/sb_session/);
  });
});
