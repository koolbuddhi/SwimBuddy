import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useSession } from '../lib/SessionContext';
import { useShares } from '../lib/SharesContext';

/**
 * Renders just under the SwimmerSwitcher when the user is currently looking
 * at someone else's log. Communicates whose log it is + the permission +
 * gives a one-tap way back to "Me". Renders nothing when viewing own data.
 */
export function SharedViewBanner() {
  const { user } = useAuth();
  const { selectedOwnerId, setSelectedOwnerId } = useSession();
  const { acceptedIncoming } = useShares();

  const share = useMemo(
    () => acceptedIncoming.find((s) => s.ownerUserId === selectedOwnerId),
    [acceptedIncoming, selectedOwnerId],
  );

  if (!user || !share) return null;

  const ownerName = share.ownerName ?? share.ownerEmail ?? 'Someone';
  const permissionLabel = share.permission === 'write' ? 'You can edit' : 'View only';

  return (
    <View style={styles.banner} testID="shared-view-banner">
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Viewing {ownerName}&apos;s log</Text>
        <Text style={styles.sub}>{permissionLabel}</Text>
      </View>
      <Pressable
        testID="shared-view-back"
        onPress={() => setSelectedOwnerId(user.id)}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>Back to mine</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 16, paddingVertical: 10,
    gap: 12,
  },
  title: { fontSize: 13, fontWeight: '700', color: '#1e40af' },
  sub: { fontSize: 11, color: '#3b82f6', marginTop: 1, fontWeight: '600' },
  backBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14, backgroundColor: '#1d4ed8',
  },
  backText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
