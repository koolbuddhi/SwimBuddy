import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../lib/auth';
import { useSession } from '../lib/SessionContext';
import { useShares } from '../lib/SharesContext';

/**
 * Chip row above Home that lets the user switch between their own log and
 * any logs that have been shared with them (and accepted). Renders nothing
 * when there are no accepted incoming shares — so the single-user flow is
 * unaffected.
 */
export function SwimmerSwitcher() {
  const { user } = useAuth();
  const { selectedOwnerId, setSelectedOwnerId } = useSession();
  const { acceptedIncoming } = useShares();

  if (!user || acceptedIncoming.length === 0) return null;

  const meActive = selectedOwnerId === user.id;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
      testID="swimmer-switcher"
    >
      <Chip
        label="Me"
        testID="swimmer-chip-me"
        active={meActive}
        onPress={() => setSelectedOwnerId(user.id)}
      />
      {acceptedIncoming.map((share) => {
        const ownerName = share.ownerName ?? share.ownerEmail ?? 'Unknown';
        const active = selectedOwnerId === share.ownerUserId;
        return (
          <Chip
            key={share.ownerUserId}
            label={ownerName}
            testID={`swimmer-chip-${share.ownerUserId}`}
            active={active}
            sub={share.permission === 'read' ? 'view only' : undefined}
            onPress={() => setSelectedOwnerId(share.ownerUserId)}
          />
        );
      })}
    </ScrollView>
  );
}

function Chip({ label, active, onPress, testID, sub }: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
  sub?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {sub && (
        <Text style={[styles.chipSub, active && styles.chipSubActive]}>{sub}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // flexGrow:0 keeps the horizontal ScrollView from filling the parent's
  // vertical space (React Native Web defaults rows to align-items:stretch,
  // which made the chips render as tall pills inside the Home flex column).
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    gap: 8, flexDirection: 'row', alignItems: 'center',
  },
  chip: {
    alignSelf: 'flex-start',  // don't let row stretch the chip vertically
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 18, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#fff' },
  chipSub: { fontSize: 10, color: '#94a3b8', marginTop: 1, fontWeight: '600' },
  chipSubActive: { color: 'rgba(255,255,255,0.85)' },
});
