import React, { createContext, useContext, useEffect, useState } from 'react';
import { localDB } from './localDB';
import { todayISO } from './time';
import type { Drill, Session } from './types';

interface SessionContextValue {
  sessions: Session[];
  loading: boolean;
  createSession(): Promise<Session>;
  updateSession(id: string, updater: (s: Session) => Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
  addDrill(sessionId: string, drill: Drill): Promise<void>;
  updateDrill(sessionId: string, drill: Drill): Promise<void>;
  deleteDrill(sessionId: string, drillId: string): Promise<void>;
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
        localDB.putSession({ ...updated, updatedAt: new Date().toISOString() });
      }
      return next;
    });
  };

  const deleteSession = async (id: string): Promise<void> => {
    await localDB.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
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
    await updateSession(sessionId, (s) => ({
      ...s,
      drills: s.drills.filter((d) => d.id !== drillId),
    }));
  };

  return (
    <SessionContext.Provider
      value={{ sessions, loading, createSession, updateSession, deleteSession, addDrill, updateDrill, deleteDrill }}
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
