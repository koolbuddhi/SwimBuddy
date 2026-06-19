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
  /** When false, the + FAB is hidden — used when viewing a shared swimmer. */
  showFab?: boolean;
  /** When true, empty-state copy reflects "they haven't logged anything", not "tap + to log". */
  viewingShared?: boolean;
}

export function HomeScreen({ sessions, onOpenSession, onNewSession, onRefresh, refreshing, showFab = true, viewingShared = false }: HomeScreenProps) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const count = sessions.length;
  const countLabel = `${count} session${count !== 1 ? 's' : ''}`;

  const refreshControl = onRefresh
    ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
    : undefined;

  return (
    <View style={styles.container}>
      {/* branding header — small, persistent identity at the top of Home */}
      <View style={styles.brandHeader} testID="brand-header">
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>🏊</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brandName}>SwimBuddy</Text>
          <Text style={styles.brandTagline}>Log every swim. Watch them grow.</Text>
        </View>
      </View>

      {count === 0 ? (
        <View testID="home-empty-state" style={styles.empty}>
          <Text style={styles.emptyText}>
            {viewingShared ? 'No sessions to show' : 'No sessions yet'}
          </Text>
          <Text style={styles.emptyHint}>
            {viewingShared
              ? "This swimmer hasn't logged anything yet."
              : 'Tap + to log your first session'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(s) => s.id}
          style={styles.listOuter}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.countLabel}>{countLabel}</Text>}
          renderItem={({ item: s }) => (
            <SessionCard session={s} onClick={() => onOpenSession(s.id)} />
          )}
          refreshControl={refreshControl}
        />
      )}

      {showFab && (
        <Pressable
          testID="home-fab"
          style={styles.fab}
          onPress={onNewSession}
          accessibilityLabel="New session"
          accessibilityRole="button"
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // alignItems:center + maxWidth on the FlatList keeps cards from stretching
  // edge-to-edge on wide browser viewports (desktop / tablet web).
  container: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center' },
  brandHeader: {
    width: '100%', maxWidth: 720,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  brandIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center',
  },
  brandIconText: { fontSize: 18 },
  brandName: { fontSize: 17, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  brandTagline: { fontSize: 11, color: '#94a3b8', marginTop: 1, fontWeight: '600' },
  listOuter: { width: '100%', maxWidth: 720, flex: 1 },
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
