import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrillRow } from './DrillRow';
import { DrillSheet } from './DrillSheet';
import { relativeDate } from '../lib/time';
import { useSession } from '../lib/SessionContext';
import type { Drill } from '../lib/types';

interface SessionScreenProps {
  sessionId: string;
  onBack: () => void;
}

export function SessionScreen({ sessionId, onBack }: SessionScreenProps) {
  const { sessions, addDrill, updateDrill, deleteDrill, deleteSession } = useSession();
  const session = sessions.find((s) => s.id === sessionId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | undefined>(undefined);

  if (!session) return null;

  const handleSave = async (patch: Omit<Drill, 'id' | 'createdAt'>) => {
    if (editingDrill) {
      await updateDrill(sessionId, { ...editingDrill, ...patch });
    } else {
      const now = new Date().toISOString();
      await addDrill(sessionId, { id: crypto.randomUUID(), createdAt: now, ...patch });
    }
    setSheetOpen(false);
    setEditingDrill(undefined);
  };

  const handleEdit = (drill: Drill) => {
    setEditingDrill(drill);
    setSheetOpen(true);
  };

  const handleDeleteDrill = (drillId: string) => {
    deleteDrill(sessionId, drillId);
  };

  const handleDeleteSession = () => {
    Alert.alert('Delete session', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(sessionId);
          onBack();
        },
      },
    ]);
  };

  const dateLabel = relativeDate(session.date);

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <Text style={styles.title}>{dateLabel}</Text>
        <Pressable testID="session-delete-btn" onPress={handleDeleteSession} style={styles.deleteBtn} accessibilityLabel="Delete session">
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>

      {/* drill list */}
      {session.drills.length === 0 ? (
        <View testID="session-empty-state" style={styles.empty}>
          <Text style={styles.emptyText}>No drills yet</Text>
          <Text style={styles.emptyHint}>Tap + to add your first drill</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {session.drills.map((d) => (
            <DrillRow
              key={d.id}
              drill={d}
              selected={false}
              onToggle={() => {}}
              onEdit={() => handleEdit(d)}
              onDelete={() => handleDeleteDrill(d.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        testID="session-add-fab"
        style={styles.fab}
        onPress={() => { setEditingDrill(undefined); setSheetOpen(true); }}
        accessibilityLabel="Add drill"
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      {/* Drill entry sheet */}
      {sheetOpen && (
        <DrillSheet
          drill={editingDrill}
          onClose={() => { setSheetOpen(false); setEditingDrill(undefined); }}
          onSave={handleSave}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
  list: { padding: 16, paddingBottom: 80 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  emptyHint: { fontSize: 14, color: '#94a3b8' },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#0ea5e9',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabIcon: { fontSize: 28, color: '#fff', lineHeight: 32 },
});
