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

// Stub useAuth — SessionContext now depends on it for sign-in-triggered
// sync. The tests don't exercise auth, so we return a null user.
jest.mock('../../lib/auth', () => ({
  useAuth: () => ({ user: null, loading: false, signIn: jest.fn(), signOut: jest.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Stub SyncClient — context tests focus on local state, not network sync.
jest.mock('../../lib/sync/client', () => ({
  SyncClient: class {
    flush = jest.fn().mockResolvedValue(undefined);
    pull = jest.fn().mockResolvedValue(undefined);
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
  mockDB.getPendingMutations.mockResolvedValue([]);
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

  // ── Group operations ──────────────────────────────────────────────────────────

  it('saveGroup adds a group with the given drillIds', async () => {
    const session = {
      ...makeSession('s1'),
      drills: [
        { id: 'd1', strokeId: 'fly' as const, distance: 25, timeCs: 1000, label: '', createdAt: '' },
        { id: 'd2', strokeId: 'back' as const, distance: 50, timeCs: 2000, label: '', createdAt: '' },
      ],
    };
    mockDB.getSessions.mockResolvedValue([session]);
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.saveGroup('s1', 'Sprint Set', ['d1', 'd2']);
    });

    const s = result.current.sessions.find((x) => x.id === 's1')!;
    expect(s.groups).toHaveLength(1);
    expect(s.groups[0].name).toBe('Sprint Set');
    expect(s.groups[0].drillIds).toEqual(['d1', 'd2']);
  });

  it('ungroupGroup removes the group but keeps drills', async () => {
    const session = {
      ...makeSession('s1'),
      drills: [
        { id: 'd1', strokeId: 'fly' as const, distance: 25, timeCs: 1000, label: '', createdAt: '' },
      ],
      groups: [{ id: 'g1', name: 'Set', drillIds: ['d1'], createdAt: '' }],
    };
    mockDB.getSessions.mockResolvedValue([session]);
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.ungroupGroup('s1', 'g1');
    });

    const s = result.current.sessions.find((x) => x.id === 's1')!;
    expect(s.groups).toHaveLength(0);
    expect(s.drills).toHaveLength(1);
  });

  it('removeGroup removes the group and its drills', async () => {
    const session = {
      ...makeSession('s1'),
      drills: [
        { id: 'd1', strokeId: 'fly' as const, distance: 25, timeCs: 1000, label: '', createdAt: '' },
        { id: 'd2', strokeId: 'back' as const, distance: 50, timeCs: 2000, label: '', createdAt: '' },
        { id: 'd3', strokeId: 'free' as const, distance: 25, timeCs: 1500, label: '', createdAt: '' },
      ],
      groups: [{ id: 'g1', name: 'Set', drillIds: ['d1', 'd2'], createdAt: '' }],
    };
    mockDB.getSessions.mockResolvedValue([session]);
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.removeGroup('s1', 'g1');
    });

    const s = result.current.sessions.find((x) => x.id === 's1')!;
    expect(s.groups).toHaveLength(0);
    expect(s.drills.map((d) => d.id)).toEqual(['d3']);
  });

  it('deleteDrill auto-deletes the group when it would have fewer than 2 drills, leaving the remaining drill ungrouped', async () => {
    const session = {
      ...makeSession('s1'),
      drills: [
        { id: 'd1', strokeId: 'fly' as const, distance: 25, timeCs: 1000, label: '', createdAt: '' },
        { id: 'd2', strokeId: 'back' as const, distance: 50, timeCs: 2000, label: '', createdAt: '' },
      ],
      groups: [{ id: 'g1', name: 'Set', drillIds: ['d1', 'd2'], createdAt: '' }],
    };
    mockDB.getSessions.mockResolvedValue([session]);
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {});

    // deleting d1 would leave d2 alone in the group → group auto-deleted;
    // d2 stays in session.drills (implicitly ungrouped).
    await act(async () => {
      await result.current.deleteDrill('s1', 'd1');
    });

    const s = result.current.sessions.find((x) => x.id === 's1')!;
    expect(s.groups).toHaveLength(0);
    expect(s.drills.map((d) => d.id)).toEqual(['d2']);
  });
});
