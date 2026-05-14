import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../lib/auth/index';

// mock localDB (used for meta storage)
jest.mock('../../lib/localDB', () => ({
  localDB: {
    getMeta: jest.fn(),
    setMeta: jest.fn(),
    getSessions: jest.fn(),
    getSession: jest.fn(),
    putSession: jest.fn(),
    deleteSession: jest.fn(),
    queueMutation: jest.fn(),
    getPendingMutations: jest.fn(),
    clearMutation: jest.fn(),
  },
}));

const { localDB: mockDB } = jest.requireMock('../../lib/localDB') as {
  localDB: { getMeta: jest.Mock; setMeta: jest.Mock };
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockDB.getMeta.mockResolvedValue({ userId: null, userEmail: null, userName: null, lastSyncedAt: null });
  mockDB.setMeta.mockResolvedValue(undefined);
});

describe('AuthContext', () => {
  it('starts with user null while loading', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('loads stored user from localDB meta on mount', async () => {
    mockDB.getMeta.mockResolvedValue({
      userId: 'uid-123',
      userEmail: 'coach@example.com',
      userName: 'Coach',
      lastSyncedAt: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual({ id: 'uid-123', email: 'coach@example.com', name: 'Coach' });
  });

  it('signIn stores user and persists to meta', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.signIn({ id: 'uid-999', email: 'new@example.com', name: 'New User' });
    });
    expect(result.current.user).toEqual({ id: 'uid-999', email: 'new@example.com', name: 'New User' });
    expect(mockDB.setMeta).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'uid-999', userEmail: 'new@example.com', userName: 'New User' }),
    );
  });

  it('signOut clears user and wipes meta', async () => {
    mockDB.getMeta.mockResolvedValue({ userId: 'uid-123', userEmail: 'coach@example.com', userName: 'Coach', lastSyncedAt: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.user).toBeNull();
    expect(mockDB.setMeta).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, userEmail: null, userName: null }),
    );
  });

  it('useAuth throws outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow();
    spy.mockRestore();
  });
});
