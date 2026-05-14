/**
 * Integration tests for SessionContext.
 * localDB is mocked so the context tests focus on state transitions.
 *
 * Note: jest.mock() is hoisted before variable declarations, so mock
 * functions must be created inside the factory (not in module scope).
 * We retrieve them after via jest.requireMock().
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { SessionProvider, useSession } from '../../lib/SessionContext';
import type { Session } from '../../lib/types';

// ── mock localDB (factory — runs before module-scope code) ────────────────────
jest.mock('../../lib/localDB', () => ({
  localDB: {
    getSessions: jest.fn(),
    getSession: jest.fn(),
    putSession: jest.fn(),
    deleteSession: jest.fn(),
    queueMutation: jest.fn(),
    getPendingMutations: jest.fn(),
    clearMutation: jest.fn(),
    getMeta: jest.fn(),
    setMeta: jest.fn(),
  },
}));

// Retrieve the mock object after the factory has run
const { localDB: mockDB } = jest.requireMock('../../lib/localDB') as {
  localDB: {
    getSessions: jest.Mock;
    getSession: jest.Mock;
    putSession: jest.Mock;
    deleteSession: jest.Mock;
    queueMutation: jest.Mock;
    getPendingMutations: jest.Mock;
    clearMutation: jest.Mock;
    getMeta: jest.Mock;
    setMeta: jest.Mock;
  };
};

// ── helpers ───────────────────────────────────────────────────────────────────
const makeSession = (id: string, date = '2026-05-13'): Session => ({
  id,
  date,
  notes: '',
  drills: [],
  groups: [],
  createdAt: '2026-05-13T10:00:00.000Z',
  updatedAt: '2026-05-13T10:00:00.000Z',
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockDB.getSessions.mockResolvedValue([]);
  mockDB.putSession.mockResolvedValue(undefined);
  mockDB.deleteSession.mockResolvedValue(undefined);
  mockDB.queueMutation.mockResolvedValue(undefined);
});

// ── tests ─────────────────────────────────────────────────────────────────────
describe('SessionContext', () => {
  it('loads sessions from localDB on mount', async () => {
    const seed = [makeSession('s1'), makeSession('s2')];
    mockDB.getSessions.mockResolvedValue(seed);

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.loading).toBe(true);

    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.sessions).toHaveLength(2);
    expect(mockDB.getSessions).toHaveBeenCalledTimes(1);
  });

  it('createSession writes to localDB then updates state', async () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {});

    let created: Session | undefined;
    await act(async () => {
      created = await result.current.createSession();
    });

    expect(mockDB.putSession).toHaveBeenCalledTimes(1);
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe(created?.id);
  });

  it('createSession creates a session dated today', async () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {});

    let created: Session | undefined;
    await act(async () => {
      created = await result.current.createSession();
    });

    const today = new Date().toLocaleDateString('en-CA');
    expect(created?.date).toBe(today);
  });

  it('updateSession writes to localDB then updates state', async () => {
    mockDB.getSessions.mockResolvedValue([makeSession('s1')]);
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.updateSession('s1', (s) => ({ ...s, notes: 'updated' }));
    });

    expect(mockDB.putSession).toHaveBeenCalledTimes(1);
    const updated = result.current.sessions.find((s) => s.id === 's1');
    expect(updated?.notes).toBe('updated');
  });

  it('deleteSession writes to localDB then removes from state', async () => {
    mockDB.getSessions.mockResolvedValue([makeSession('s1'), makeSession('s2')]);
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.deleteSession('s1');
    });

    expect(mockDB.deleteSession).toHaveBeenCalledWith('s1');
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe('s2');
  });

  it('useSession throws when called outside SessionProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSession())).toThrow();
    spy.mockRestore();
  });
});
