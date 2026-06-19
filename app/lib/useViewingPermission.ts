import { useMemo } from 'react';
import { useAuth } from './auth';
import { useSession } from './SessionContext';
import { useShares } from './SharesContext';

export type ViewingPermission = 'owner' | 'write' | 'read';

/**
 * What can the current user do with the currently-visible swimmer's sessions?
 *
 * - 'owner': it's me — full read+write+delete
 * - 'write': someone else's log, shared with me with write permission
 * - 'read':  someone else's log, shared with me with read-only permission
 *
 * Default is 'owner' (the single-user case). Falls back to 'read' if for some
 * reason the share record can't be found — fail closed.
 */
export function useViewingPermission(): ViewingPermission {
  const { user } = useAuth();
  const { selectedOwnerId } = useSession();
  const { acceptedIncoming } = useShares();

  return useMemo(() => {
    if (!user) return 'read';
    if (!selectedOwnerId || selectedOwnerId === user.id) return 'owner';
    const share = acceptedIncoming.find((s) => s.ownerUserId === selectedOwnerId);
    if (!share) return 'read';
    return share.permission;
  }, [user, selectedOwnerId, acceptedIncoming]);
}
