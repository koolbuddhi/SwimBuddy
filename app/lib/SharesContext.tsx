import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { SharesClient, ShareError } from './sharesClient';
import type { Share, SharePermission, SharesSnapshot } from './types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8787';

interface SharesContextValue {
  outgoing: Share[];
  incoming: Share[];
  /** Accepted incoming shares — drives the swimmer-switcher chip row. */
  acceptedIncoming: Share[];
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  invite(email: string, permission: SharePermission): Promise<Share>;
  accept(id: string): Promise<void>;
  decline(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
}

const SharesContext = createContext<SharesContextValue | null>(null);

export function SharesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const client = useMemo(() => new SharesClient(API_BASE), []);
  const [outgoing, setOutgoing] = useState<Share[]>([]);
  const [incoming, setIncoming] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setOutgoing([]);
      setIncoming([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap: SharesSnapshot = await client.list();
      setOutgoing(snap.outgoing ?? []);
      setIncoming(snap.incoming ?? []);
    } catch (e) {
      // 401 here usually means the cookie expired and the user needs to sign
      // in again — surface that as a hint, not a stack-trace-y HTTP code.
      if (e instanceof ShareError && e.code === 'unauthenticated') {
        setError('Please sign in again to view your shares.');
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [client, user]);

  // Refresh when the signed-in user changes (id-based so that a stable
  // reference doesn't suppress the retry — bug seen in dev where a stale
  // local user blocked the auto-fetch after re-signin).
  useEffect(() => {
    refresh();
  }, [user?.id, refresh]);

  const invite = useCallback(async (email: string, permission: SharePermission) => {
    const created = await client.invite(email, permission);
    await refresh();
    return created;
  }, [client, refresh]);

  const accept = useCallback(async (id: string) => {
    // Optimistic flip
    setIncoming((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'accepted', acceptedAt: new Date().toISOString() } : s)),
    );
    try {
      await client.accept(id);
      refresh();
    } catch (e) {
      await refresh();  // revert via re-fetch
      throw e;
    }
  }, [client, refresh]);

  const decline = useCallback(async (id: string) => {
    setIncoming((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'declined' } : s)),
    );
    try {
      await client.decline(id);
      refresh();
    } catch (e) {
      await refresh();
      throw e;
    }
  }, [client, refresh]);

  const revoke = useCallback(async (id: string) => {
    // Locally mark as revoked in either list optimistically
    const stamp = (s: Share): Share => ({ ...s, status: 'revoked', revokedAt: new Date().toISOString() });
    setOutgoing((prev) => prev.map((s) => (s.id === id ? stamp(s) : s)));
    setIncoming((prev) => prev.map((s) => (s.id === id ? stamp(s) : s)));
    try {
      await client.revoke(id);
      refresh();
    } catch (e) {
      await refresh();
      throw e;
    }
  }, [client, refresh]);

  const acceptedIncoming = useMemo(
    () => incoming.filter((s) => s.status === 'accepted'),
    [incoming],
  );

  return (
    <SharesContext.Provider
      value={{ outgoing, incoming, acceptedIncoming, loading, error, refresh, invite, accept, decline, revoke }}
    >
      {children}
    </SharesContext.Provider>
  );
}

export function useShares(): SharesContextValue {
  const ctx = useContext(SharesContext);
  if (!ctx) throw new Error('useShares must be used within a SharesProvider');
  return ctx;
}

export { ShareError };
