import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SessionCard } from './SessionCard';
import type { Session } from '../lib/types';

interface HomeScreenProps {
  sessions: Session[];
  onOpenSession: (id: string) => void;
  onNewSession: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function HomeScreen({ sessions, onOpenSession, onNewSession, onRefresh, refreshing }: HomeScreenProps) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const count = sessions.length;
  const countLabel = `${count} session${count !== 1 ? 's' : ''}`;

  const refreshControl = onRefresh
    ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
    : undefined;

  return (
    <View style={styles.container}>
      {count === 0 ? (
        <View testID="home-empty-state" style={styles.empty}>
          <Text style={styles.emptyText}>No sessions yet</Text>
          <Text style={styles.emptyHint}>Tap + to log your first session</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.countLabel}>{countLabel}</Text>}
          renderItem={({ item: s }) => (
            <SessionCard session={s} onClick={() => onOpenSession(s.id)} />
          )}
          refreshControl={refreshControl}
        />
      )}

      <Pressable
        testID="home-fab"
        style={styles.fab}
        onPress={onNewSession}
        accessibilityLabel="New session"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, paddingBottom: 80 },
  countLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  emptyHint: { fontSize: 14, color: '#94a3b8' },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#0ea5e9',
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(14, 165, 233, 0.4)', elevation: 6,
  },
  fabIcon: { fontSize: 28, color: '#fff', lineHeight: 32 },
});
