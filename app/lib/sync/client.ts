import { localDB } from '../localDB';
import type { MutationQueueEntry } from '../types';

export class SyncClient {
  constructor(private readonly apiBase: string) {}

  async flush(): Promise<void> {
    const mutations = await localDB.getPendingMutations();
    if (mutations.length === 0) return;

    const body = {
      mutations: mutations.map((m: MutationQueueEntry) => m.op),
    };

    const res = await fetch(`${this.apiBase}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (!res.ok) return;

    const { syncedAt } = await res.json() as { syncedAt: string };

    // clear all sent mutations
    await Promise.all(mutations.map((m: MutationQueueEntry) => localDB.clearMutation(m.id)));
    await localDB.setMeta({ lastSyncedAt: syncedAt });
  }

  async pull(): Promise<void> {
    const res = await fetch(`${this.apiBase}/sync`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return;

    const { sessions } = await res.json() as { sessions: unknown[] };
    for (const s of sessions) {
      await localDB.putSession(s as Parameters<typeof localDB.putSession>[0]);
    }
  }
}
