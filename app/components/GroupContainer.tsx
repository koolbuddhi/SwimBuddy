import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DrillRow } from './DrillRow';
import { csToTime } from '../lib/time';
import type { Drill, Group } from '../lib/types';

interface GroupContainerProps {
  group: Group;
  drills: Drill[];
  onUngroup: () => void;
  onRemoveGroup: () => void;
  onEditDrill: (drill: Drill) => void;
  onDeleteDrill: (drillId: string) => void;
  /** When true, hides ungroup/remove/edit/delete actions. */
  readOnly?: boolean;
}

export function GroupContainer({
  group,
  drills,
  onUngroup,
  onRemoveGroup,
  onEditDrill,
  onDeleteDrill,
  readOnly,
}: GroupContainerProps) {
  const [expanded, setExpanded] = useState(true);
  const totalCs = drills.reduce((sum, d) => sum + d.timeCs, 0);

  return (
    <View style={styles.container}>
      {/* header */}
      <Pressable testID="group-header" style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.headerLeft}>
          <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
          <Text style={styles.name}>{group.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.total}>{csToTime(totalCs)}</Text>
          {!readOnly && (
            <>
              <Pressable testID="group-ungroup-btn" onPress={onUngroup} style={styles.actionBtn} accessibilityLabel="Ungroup">
                <Text style={styles.ungroupText}>Ungroup</Text>
              </Pressable>
              <Pressable testID="group-remove-btn" onPress={onRemoveGroup} style={styles.actionBtn} accessibilityLabel="Remove group">
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>

      {/* drills */}
      {expanded && (
        <View style={styles.drillList}>
          {drills.map((d) => (
            <DrillRow
              key={d.id}
              drill={d}
              selected={false}
              onToggle={() => {}}
              onEdit={() => onEditDrill(d)}
              onDelete={() => onDeleteDrill(d.id)}
              readOnly={readOnly}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevron: { fontSize: 13, color: '#0369a1' },
  name: { fontSize: 14, fontWeight: '700', color: '#0369a1', flex: 1 },
  total: { fontSize: 14, fontWeight: '700', color: '#0369a1', fontVariant: ['tabular-nums'] },
  actionBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  ungroupText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  removeText: { fontSize: 14, color: '#dc2626', fontWeight: '700' },
  drillList: { padding: 8, gap: 0 },
});
