import Dexie, { type Table } from 'dexie';
import type { Session, Meta, MutationOp, MutationQueueEntry, LocalDB } from '../types';

interface MetaRow {
  key: 'singleton';
  lastSyncedAt: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
}

interface MutationRow {
  id: string;
  opJson: string; // JSON-serialised MutationOp
  ts: string;
  retries: number;
}

const DEFAULT_META: MetaRow = {
  key: 'singleton',
  lastSyncedAt: null,
  userId: null,
  userEmail: null,
  userName: null,
};

export class SwimBuddyDB extends Dexie implements LocalDB {
  sessions!: Table<Session, string>;
  mutationQueue!: Table<MutationRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('SwimBuddyDB');
    this.version(1).stores({
      sessions: 'id, date',       // indexed by date for sorted queries
      mutationQueue: 'id, ts',
      meta: 'key',
    });
  }

  async getSessions(): Promise<Session[]> {
    return this.sessions.orderBy('date').reverse().toArray();
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async putSession(session: Session): Promise<void> {
    await this.sessions.put(session);
  }

  async deleteSession(id: string): Promise<void> {
    await this.sessions.delete(id);
  }

  async queueMutation(op: MutationOp): Promise<void> {
    const entry: MutationRow = {
      id: crypto.randomUUID(),
      opJson: JSON.stringify(op),
      ts: new Date().toISOString(),
      retries: 0,
    };
    await this.mutationQueue.add(entry);
  }

  async getPendingMutations(): Promise<MutationQueueEntry[]> {
    const rows = await this.mutationQueue.orderBy('ts').toArray();
    return rows.map((r) => ({
      id: r.id,
      op: JSON.parse(r.opJson) as MutationOp,
      ts: r.ts,
      retries: r.retries,
    }));
  }

  async clearMutation(id: string): Promise<void> {
    await this.mutationQueue.delete(id);
  }

  async getMeta(): Promise<Meta> {
    const row = await this.meta.get('singleton');
    if (!row) return { ...DEFAULT_META };
    const { key: _key, ...rest } = row;
    return rest;
  }

  async setMeta(patch: Partial<Meta>): Promise<void> {
    const current = await this.getMeta();
    await this.meta.put({ key: 'singleton', ...current, ...patch });
  }
}

export function createWebDB(): SwimBuddyDB {
  return new SwimBuddyDB();
}
