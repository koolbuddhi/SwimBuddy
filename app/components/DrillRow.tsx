import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { csToTime } from '../lib/time';
import type { Drill, StrokeId } from '../lib/types';

const STROKE_MAP: Record<StrokeId, { short: string; color: string }> = {
  fly:    { short: 'Fly',   color: '#f59e0b' },
  back:   { short: 'Back',  color: '#10b981' },
  breast: { short: 'Breast', color: '#8b5cf6' },
  free:   { short: 'Free',  color: '#3b82f6' },
  mixed:  { short: 'Mix',   color: '#64748b' },
};

const STROKE_NAMES: Record<StrokeId, string> = {
  fly:    'Butterfly',
  back:   'Backstroke',
  breast: 'Breaststroke',
  free:   'Freestyle',
  mixed:  'Mixed',
};

interface DrillRowProps {
  drill: Drill;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function DrillRow({ drill, selected, onToggle, onEdit, onDelete }: DrillRowProps) {
  const stroke = STROKE_MAP[drill.strokeId] ?? STROKE_MAP.mixed;
  const strokeName = STROKE_NAMES[drill.strokeId] ?? 'Mixed';

  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <Pressable
        testID="drill-row-main"
        style={styles.main}
        onPress={onToggle}
        accessibilityLabel={`${drill.distance}M ${strokeName}, ${csToTime(drill.timeCs)}${selected ? ', selected' : ''}`}
        accessibilityState={{ selected }}
      >
        {/* checkbox */}
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>

        {/* stroke chip */}
        <View style={[styles.chip, { backgroundColor: stroke.color }]}>
          <Text style={styles.chipText}>{stroke.short}</Text>
        </View>

        {/* info */}
        <View style={styles.info}>
          <Text style={styles.title}>{drill.distance}M {strokeName}</Text>
          {drill.label ? (
            <Text testID="drill-label" style={styles.labelText} numberOfLines={1}>
              {drill.label}
            </Text>
          ) : null}
        </View>

        {/* time */}
        <Text style={styles.time}>{csToTime(drill.timeCs)}</Text>
      </Pressable>

      {/* action buttons */}
      <View style={styles.actions}>
        <Pressable
          testID="drill-edit-btn"
          onPress={onEdit}
          accessibilityLabel="Edit drill"
          style={styles.actionBtn}
        >
          <Text style={styles.actionEdit}>✎</Text>
        </Pressable>
        <Pressable
          testID="drill-delete-btn"
          onPress={onDelete}
          accessibilityLabel="Delete drill"
          style={styles.actionBtn}
        >
          <Text style={styles.actionDelete}>🗑</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    marginBottom: 6,
  },
  rowSelected: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxSelected: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '700' },
  chip: {
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6,
    minWidth: 38, alignItems: 'center', flexShrink: 0,
  },
  chipText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  labelText: { fontSize: 11, color: '#64748b', marginTop: 1 },
  time: { fontSize: 16, fontWeight: '700', color: '#0f172a', fontVariant: ['tabular-nums'], marginRight: 4 },
  actions: { flexDirection: 'column', borderLeftWidth: 1, borderLeftColor: '#f1f5f9' },
  actionBtn: { flex: 1, width: 36, alignItems: 'center', justifyContent: 'center' },
  actionEdit: { fontSize: 14, color: '#64748b' },
  actionDelete: { fontSize: 14 },
});
