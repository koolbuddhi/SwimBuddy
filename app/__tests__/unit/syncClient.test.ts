/**
 * Unit tests for lib/sync/client.ts.
 * Fetch is mocked globally; localDB is mocked.
 */

jest.mock('../../lib/localDB', () => ({
  localDB: {
    getSessions: jest.fn(),
    putSession: jest.fn(),
    queueMutation: jest.fn(),
    getPendingMutations: jest.fn(),
    clearMutation: jest.fn(),
    getMeta: jest.fn(),
    setMeta: jest.fn(),
    getSession: jest.fn(),
    deleteSession: jest.fn(),
  },
}));

const { localDB: mockDB } = jest.requireMock('../../lib/localDB') as {
  localDB: Record<string, jest.Mock>;
};

const mockFetch = jest.fn();
(globalThis as typeof globalThis & { fetch: jest.Mock }).fetch = mockFetch;

import { SyncClient } from '../../lib/sync/client';
import type { MutationQueueEntry } from '../../lib/types';

beforeEach(() => {
  jest.clearAllMocks();
  mockDB.getPendingMutations.mockResolvedValue([]);
  mockDB.clearMutation.mockResolvedValue(undefined);
  mockDB.putSession.mockResolvedValue(undefined);
  mockDB.setMeta.mockResolvedValue(undefined);
  mockDB.getMeta.mockResolvedValue({ lastSyncedAt: null, userId: 'uid-1', userEmail: null, userName: null });
});

describe('SyncClient', () => {
  it('calls POST /sync with pending mutations', async () => {
    const mutation: MutationQueueEntry = {
      id: 'mut-1', ts: '2026-05-13T10:00:00Z', retries: 0,
      op: { op: 'upsert_session', session: { id: 's1', date: '2026-05-13', notes: '', drills: [], groups: [], createdAt: '', updatedAt: '' }, clientVersion: 1 },
    };
    mockDB.getPendingMutations.mockResolvedValueOnce([mutation]);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, syncedAt: '2026-05-13T11:00:00Z' }),
    });

    const client = new SyncClient('/api');
    await client.flush();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sync',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('clears mutations after successful flush', async () => {
    const mutation: MutationQueueEntry = {
      id: 'mut-1', ts: '', retries: 0,
      op: { op: 'delete_session', sessionId: 's1' },
    };
    mockDB.getPendingMutations.mockResolvedValueOnce([mutation]);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, syncedAt: '2026-05-13T11:00:00Z' }),
    });

    const client = new SyncClient('/api');
    await client.flush();

    expect(mockDB.clearMutation).toHaveBeenCalledWith('mut-1');
  });

  it('does not call fetch when no pending mutations', async () => {
    const client = new SyncClient('/api');
    await client.flush();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not clear mutations when server returns error', async () => {
    const mutation: MutationQueueEntry = {
      id: 'mut-1', ts: '', retries: 0,
      op: { op: 'delete_session', sessionId: 's1' },
    };
    mockDB.getPendingMutations.mockResolvedValueOnce([mutation]);
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const client = new SyncClient('/api');
    await client.flush();

    expect(mockDB.clearMutation).not.toHaveBeenCalled();
  });
});
