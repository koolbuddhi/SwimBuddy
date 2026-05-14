import React, { createContext, useContext, useEffect, useState } from 'react';
import { localDB } from './localDB';
import { todayISO } from './time';
import type { Drill, Session } from './types';

interface SessionContextValue {
  sessions: Session[];
  loading: boolean;
  pendingCount: number;
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localDB.getSessions().then((all) => {
      setSessions(all);
      setLoading(false);
    });
  }, []);

  const [pendingCount, setPendingCount] = useState(0);

  const queueOp = (op: Parameters<typeof localDB.queueMutation>[0]) => {
    localDB.queueMutation(op);
    setPendingCount((n) => n + 1);
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
      // auto-delete groups that now have fewer than 2 drills
      const groups = s.groups.filter((g) => {
        const remaining = g.drillIds.filter((id) => id !== drillId);
        return remaining.length >= 2;
      }).map((g) => ({ ...g, drillIds: g.drillIds.filter((id) => id !== drillId) }));
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
        sessions, loading, pendingCount, createSession, updateSession, deleteSession,
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
