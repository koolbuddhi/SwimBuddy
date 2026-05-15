import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DrillRow } from './DrillRow';
import { DrillSheet } from './DrillSheet';
import { GroupContainer } from './GroupContainer';
import { SelectionBar } from './SelectionBar';
import { relativeDate } from '../lib/time';
import { useSession } from '../lib/SessionContext';
import type { Drill } from '../lib/types';

interface SessionScreenProps {
  sessionId: string;
  onBack: () => void;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function SessionScreen({ sessionId, onBack }: SessionScreenProps) {
  const { sessions, updateSession, addDrill, updateDrill, deleteDrill, deleteSession, saveGroup, ungroupGroup, removeGroup } =
    useSession();
  const session = sessions.find((s) => s.id === sessionId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateEditOpen, setDateEditOpen] = useState(false);
  const [dateInput, setDateInput] = useState('');

  if (!session) return null;

  // drillIds that belong to any group
  const groupedDrillIds = new Set(session.groups.flatMap((g) => g.drillIds));
  const ungroupedDrills = session.drills.filter((d) => !groupedDrillIds.has(d.id));

  const toggleDrill = (drillId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(drillId)) next.delete(drillId);
      else next.add(drillId);
      return next;
    });
  };

  const selectedCs = session.drills
    .filter((d) => selectedIds.has(d.id))
    .reduce((sum, d) => sum + d.timeCs, 0);

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
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(drillId); return n; });
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

  const handleSaveGroup = async (name: string) => {
    await saveGroup(sessionId, name, [...selectedIds]);
    setSelectedIds(new Set());
  };

  const dateLabel = relativeDate(session.date);

  const openDateEditor = () => {
    setDateInput(session.date);
    setDateEditOpen(true);
  };

  const handleDateSave = async () => {
    if (!ISO_DATE_RE.test(dateInput)) return;
    await updateSession(sessionId, (s) => ({ ...s, date: dateInput }));
    setDateEditOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <Pressable testID="session-back-btn" onPress={onBack} style={styles.backBtn} accessibilityLabel="Back to sessions" hitSlop={8}>
          <Text style={styles.backBtnText}>← Sessions</Text>
        </Pressable>
        <Pressable testID="session-date-btn" onPress={openDateEditor} style={styles.titleBtn} accessibilityLabel="Change session date">
          <Text style={styles.title}>{dateLabel}</Text>
          <Text style={styles.titleHint}>{session.date}</Text>
        </Pressable>
        <Pressable testID="session-delete-btn" onPress={handleDeleteSession} style={styles.deleteBtn} accessibilityLabel="Delete session">
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>

      {/* selection bar (when drills selected) */}
      {selectedIds.size > 0 && (
        <SelectionBar
          selectedCount={selectedIds.size}
          totalCs={selectedCs}
          onSaveGroup={handleSaveGroup}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {/* drill list */}
      {session.drills.length === 0 ? (
        <View testID="session-empty-state" style={styles.empty}>
          <Text style={styles.emptyText}>No drills yet</Text>
          <Text style={styles.emptyHint}>Tap + to add your first drill</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {/* grouped drills */}
          {session.groups.map((g) => {
            const groupDrills = g.drillIds
              .map((id) => session.drills.find((d) => d.id === id))
              .filter((d): d is Drill => d !== undefined);
            return (
              <GroupContainer
                key={g.id}
                group={g}
                drills={groupDrills}
                onUngroup={() => ungroupGroup(sessionId, g.id)}
                onRemoveGroup={() => removeGroup(sessionId, g.id)}
                onEditDrill={handleEdit}
                onDeleteDrill={(drillId) => handleDeleteDrill(drillId)}
              />
            );
          })}

          {/* ungrouped drills */}
          {ungroupedDrills.map((d) => (
            <DrillRow
              key={d.id}
              drill={d}
              selected={selectedIds.has(d.id)}
              onToggle={() => toggleDrill(d.id)}
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

      {/* Date editor */}
      <Modal transparent visible={dateEditOpen} animationType="fade" onRequestClose={() => setDateEditOpen(false)}>
        <Pressable testID="date-edit-backdrop" style={styles.dateBackdrop} onPress={() => setDateEditOpen(false)} />
        <View style={styles.dateCard}>
          <Text style={styles.dateTitle}>Change session date</Text>
          <Text style={styles.dateHint}>Backfill an older session you missed logging.</Text>
          <TextInput
            testID="date-edit-input"
            style={styles.dateInput}
            value={dateInput}
            onChangeText={setDateInput}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="numeric"
          />
          <View style={styles.dateRow}>
            <Pressable testID="date-edit-cancel" onPress={() => setDateEditOpen(false)} style={styles.dateCancel}>
              <Text style={styles.dateCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="date-edit-save"
              onPress={handleDateSave}
              style={[styles.dateSave, !ISO_DATE_RE.test(dateInput) && styles.dateSaveDisabled]}
              disabled={!ISO_DATE_RE.test(dateInput)}
            >
              <Text style={styles.dateSaveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  titleBtn: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  titleHint: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  backBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#0ea5e9' },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
  dateBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  dateCard: {
    position: 'absolute', top: '30%', left: 24, right: 24,
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.2)',
  },
  dateTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  dateHint: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  dateInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '600', color: '#0f172a', backgroundColor: '#f8fafc' },
  dateRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  dateCancel: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  dateCancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  dateSave: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0ea5e9' },
  dateSaveDisabled: { opacity: 0.4 },
  dateSaveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  list: { padding: 16, paddingBottom: 80 },
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
