import React, { createContext, useContext, useEffect, useState } from 'react';
import { localDB } from '../localDB';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn(user: AuthUser): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localDB.getMeta().then((meta) => {
      if (meta.userId && meta.userEmail) {
        setUser({ id: meta.userId, email: meta.userEmail, name: meta.userName ?? meta.userEmail });
      }
      setLoading(false);
    });
  }, []);

  const signIn = async (u: AuthUser): Promise<void> => {
    await localDB.setMeta({ userId: u.id, userEmail: u.email, userName: u.name });
    setUser(u);
  };

  const signOut = async (): Promise<void> => {
    await localDB.setMeta({ userId: null, userEmail: null, userName: null });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
