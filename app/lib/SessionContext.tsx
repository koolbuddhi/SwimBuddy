import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { localDB } from './localDB';
import { todayISO } from './time';
import { SyncClient } from './sync/client';
import { useAuth } from './auth';
import type { Drill, Session } from './types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8787';

interface SessionContextValue {
  sessions: Session[];
  loading: boolean;
  pendingCount: number;
  syncing: boolean;
  sync(): Promise<void>;
  createSession(): Promise<Session>;
  updateSession(id: string, updater: (s: Session) => Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
  addDrill(sessionId: string, drill: Drill): Promise<void>;
  updateDrill(sessionId: string, drill: Drill): Promise<void>;
  deleteDrill(sessionId: string, drillId: string): Promise<void>;
  saveGroup(sessionId: string, name: string, drillIds: string[]): Promise<void>;
  ungroupGroup(sessionId: string, groupId: string): Promise<void>;
  removeGroup(sessionId: string, groupId: string): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const syncClient = useMemo(() => new SyncClient(API_BASE), []);
  const syncInFlight = useRef(false);
  const syncScheduled = useRef(false);

  // Flush local writes → pull server state → refresh React state.
  // If called while a sync is already in flight, schedules a follow-up run
  // so writes queued during the current flush don't get stranded.
  const sync = useCallback(async () => {
    if (!user) return;
    if (syncInFlight.current) {
      syncScheduled.current = true;
      return;
    }
    syncInFlight.current = true;
    setSyncing(true);
    try {
      await syncClient.flush();
      await syncClient.pull();
      const merged = await localDB.getSessions();
      setSessions(merged);
      const queue = await localDB.getPendingMutations();
      setPendingCount(queue.length);
    } catch {
      // Offline or transient failure — local data is still valid.
    } finally {
      syncInFlight.current = false;
      setSyncing(false);
      if (syncScheduled.current) {
        syncScheduled.current = false;
        // Recurse to drain any mutations queued during this run.
        sync();
      }
    }
  }, [syncClient, user]);

  // Initial load: show local immediately, then sync if signed in.
  useEffect(() => {
    let cancelled = false;
    localDB.getSessions().then(async (all) => {
      if (cancelled) return;
      setSessions(all);
      setLoading(false);
      const queue = await localDB.getPendingMutations();
      if (cancelled) return;
      setPendingCount(queue.length);
    });
    return () => { cancelled = true; };
  }, []);

  // When user signs in (or changes), do a full sync.
  useEffect(() => {
    if (!user) return;
    sync();
  }, [user?.id, sync]);

  // Re-sync when the tab regains focus or the network comes back online.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onFocus = () => { if (document.visibilityState === 'visible') sync(); };
    const onOnline = () => sync();
    window.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [sync]);

  const queueOp = (op: Parameters<typeof localDB.queueMutation>[0]) => {
    localDB.queueMutation(op);
    setPendingCount((n) => n + 1);
    // Fire-and-forget background sync; reflects writes to other devices.
    if (user) sync();
  };

  const createSession = async (): Promise<Session> => {
    const now = new Date().toISOString();
    const session: Session = {
      id: crypto.randomUUID(),
      date: todayISO(),
      notes: '',
      drills: [],
      groups: [],
      createdAt: now,
      updatedAt: now,
    };
    await localDB.putSession(session);
    setSessions((prev) => [session, ...prev]);
    queueOp({ op: 'upsert_session', session, clientVersion: 1 });
    return session;
  };

  const updateSession = async (
    id: string,
    updater: (s: Session) => Session,
  ): Promise<void> => {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === id ? updater(s) : s));
      const updated = next.find((s) => s.id === id);
      if (updated) {
        const withTs = { ...updated, updatedAt: new Date().toISOString() };
        localDB.putSession(withTs);
        queueOp({ op: 'upsert_session', session: withTs, clientVersion: 1 });
      }
      return next;
    });
  };

  const deleteSession = async (id: string): Promise<void> => {
    await localDB.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    queueOp({ op: 'delete_session', sessionId: id });
  };

  const addDrill = async (sessionId: string, drill: Drill): Promise<void> => {
    await updateSession(sessionId, (s) => ({
      ...s,
      drills: [...s.drills, drill],
    }));
  };

  const updateDrill = async (sessionId: string, drill: Drill): Promise<void> => {
    await updateSession(sessionId, (s) => ({
      ...s,
      drills: s.drills.map((d) => (d.id === drill.id ? drill : d)),
    }));
  };

  const deleteDrill = async (sessionId: string, drillId: string): Promise<void> => {
    await updateSession(sessionId, (s) => {
      const drills = s.drills.filter((d) => d.id !== drillId);
      // Auto-delete a group once it would have < 2 drills. The lone remaining
      // drill is implicitly ungrouped (it stays in s.drills; only the group
      // entry is dropped). A group of 1 isn't a meaningful "sum group".
      const groups = s.groups
        .map((g) => ({ ...g, drillIds: g.drillIds.filter((id) => id !== drillId) }))
        .filter((g) => g.drillIds.length >= 2);
      return { ...s, drills, groups };
    });
  };

  const saveGroup = async (sessionId: string, name: string, drillIds: string[]): Promise<void> => {
    await updateSession(sessionId, (s) => ({
      ...s,
      groups: [
        ...s.groups,
        { id: crypto.randomUUID(), name, drillIds, createdAt: new Date().toISOString() },
      ],
    }));
  };

  const ungroupGroup = async (sessionId: string, groupId: string): Promise<void> => {
    await updateSession(sessionId, (s) => ({
      ...s,
      groups: s.groups.filter((g) => g.id !== groupId),
    }));
  };

  const removeGroup = async (sessionId: string, groupId: string): Promise<void> => {
    await updateSession(sessionId, (s) => {
      const group = s.groups.find((g) => g.id === groupId);
      const drillIdsToRemove = new Set(group?.drillIds ?? []);
      return {
        ...s,
        drills: s.drills.filter((d) => !drillIdsToRemove.has(d.id)),
        groups: s.groups.filter((g) => g.id !== groupId),
      };
    });
  };

  return (
    <SessionContext.Provider
      value={{
        sessions, loading, pendingCount, syncing, sync,
        createSession, updateSession, deleteSession,
        addDrill, updateDrill, deleteDrill,
        saveGroup, ungroupGroup, removeGroup,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
