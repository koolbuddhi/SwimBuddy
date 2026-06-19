import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { SharesProvider, useShares } from '../../lib/SharesContext';
import { ShareError } from '../../lib/sharesClient';

// ── mocks ─────────────────────────────────────────────────────────────────────
const mockListResult = jest.fn();
const mockInvite = jest.fn();
const mockAccept = jest.fn();
const mockDecline = jest.fn();
const mockRevoke = jest.fn();

jest.mock('../../lib/sharesClient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('../../lib/sharesClient');
  return {
    ...actual,
    SharesClient: class {
      list = jest.fn(() => mockListResult());
      invite = jest.fn((...a: unknown[]) => mockInvite(...a));
      accept = jest.fn((id: string) => mockAccept(id));
      decline = jest.fn((id: string) => mockDecline(id));
      revoke = jest.fn((id: string) => mockRevoke(id));
    },
  };
});

const mockUseAuth = jest.fn();
jest.mock('../../lib/auth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockListResult.mockResolvedValue({ outgoing: [], incoming: [] });
  mockUseAuth.mockReturnValue({ user: null });
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SharesProvider>{children}</SharesProvider>
);

describe('SharesContext', () => {
  it('does not fetch when no user is signed in', async () => {
    const { result } = renderHook(() => useShares(), { wrapper });
    await act(async () => {});
    expect(mockListResult).not.toHaveBeenCalled();
    expect(result.current.outgoing).toEqual([]);
    expect(result.current.incoming).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches once a user is signed in', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'me', email: 'm@x', name: 'Me' } });
    renderHook(() => useShares(), { wrapper });
    await act(async () => {});
    expect(mockListResult).toHaveBeenCalled();
  });

  it('re-fetches when the signed-in user id changes — protects against stale cookie/state mismatch', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'me-1' } });
    const { rerender } = renderHook(() => useShares(), { wrapper });
    await act(async () => {});
    expect(mockListResult).toHaveBeenCalledTimes(1);

    mockUseAuth.mockReturnValue({ user: { id: 'me-2' } });
    rerender({} as never);
    await act(async () => {});
    expect(mockListResult).toHaveBeenCalledTimes(2);
  });

  it('surfaces a friendly message on 401 (not the raw HTTP status)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'me' } });
    mockListResult.mockRejectedValueOnce(new ShareError('unauthenticated', 'Sign in required'));
    const { result } = renderHook(() => useShares(), { wrapper });
    await act(async () => {});
    expect(result.current.error).toMatch(/sign in/i);
    expect(result.current.error).not.toContain('401');
  });

  it('clears error when the user signs out', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'me' } });
    mockListResult.mockRejectedValueOnce(new ShareError('unauthenticated', 'Sign in required'));
    const { result, rerender } = renderHook(() => useShares(), { wrapper });
    await act(async () => {});
    expect(result.current.error).toBeTruthy();

    mockUseAuth.mockReturnValue({ user: null });
    rerender({} as never);
    await act(async () => {});
    expect(result.current.error).toBeNull();
  });
});
