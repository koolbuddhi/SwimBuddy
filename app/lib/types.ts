export type StrokeId = 'fly' | 'back' | 'breast' | 'free' | 'mixed';

export interface Drill {
  id: string;
  strokeId: StrokeId;
  distance: number;   // meters, positive integer
  timeCs: number;     // centiseconds — e.g. 30.45 s = 3045
  label: string;      // optional free text (empty string when absent)
  createdAt: string;  // ISO timestamp
}

export interface Group {
  id: string;
  name: string;
  drillIds: string[]; // ordered refs to Drill.id within the same session
  createdAt: string;
}

export interface Session {
  id: string;
  date: string;       // YYYY-MM-DD (device-local, no UTC conversion)
  notes: string;
  drills: Drill[];
  groups: Group[];
  createdAt: string;
  updatedAt: string;
  // ── Share-aware fields (added in feat/share-sessions) ─────────────────────
  // ownerId is the user who created the session. Always present after the
  // share feature ships; older local rows fall back to currentUser.id on read.
  ownerId?: string;
  // Last non-owner editor; null when the owner made the most recent edit.
  lastEditedByUserId?: string | null;
  lastEditedAt?: string | null;
}

// ── Mutation queue ────────────────────────────────────────────────────────────

export type MutationOp =
  | { op: 'upsert_session'; session: Session; clientVersion: number }
  | { op: 'delete_session'; sessionId: string };

export interface MutationQueueEntry {
  id: string;       // local UUID for deduplication
  op: MutationOp;
  ts: string;       // ISO timestamp when the mutation was created
  retries: number;
}

// ── Local DB interface ────────────────────────────────────────────────────────

export interface Meta {
  lastSyncedAt: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
}

export interface LocalDB {
  getSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  putSession(session: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
  queueMutation(op: MutationOp): Promise<void>;
  getPendingMutations(): Promise<MutationQueueEntry[]>;
  clearMutation(id: string): Promise<void>;
  getMeta(): Promise<Meta>;
  setMeta(patch: Partial<Meta>): Promise<void>;
}

// ── Sync status ───────────────────────────────────────────────────────────────

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage?: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// ── Sharing ───────────────────────────────────────────────────────────────────

export type SharePermission = 'read' | 'write';
export type ShareStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface Share {
  id: string;
  ownerUserId: string;
  recipientUserId: string;
  ownerEmail?: string;
  ownerName?: string | null;
  recipientEmail?: string;
  recipientName?: string | null;
  permission: SharePermission;
  status: ShareStatus;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface SharesSnapshot {
  outgoing: Share[];
  incoming: Share[];
}
