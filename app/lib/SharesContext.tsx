import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { SharesClient, ShareError } from './sharesClient';
import type { Share, SharePermission } from './types';

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
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await client.list();
      setOutgoing(snap.outgoing ?? []);
      setIncoming(snap.incoming ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [client, user]);

  // Refresh on sign-in.
  useEffect(() => {
    refresh();
  }, [refresh]);

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
