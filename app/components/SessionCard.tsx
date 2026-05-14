import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { csToTime, relativeDate } from '../lib/time';
import type { Session } from '../lib/types';

interface SessionCardProps {
  session: Session;
  onClick: () => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const drillCount = session.drills.length;
  const groupCount = session.groups.length;
  const totalCs = session.drills.reduce((sum, d) => sum + d.timeCs, 0);

  const bestGroup =
    groupCount > 0
      ? session.groups.reduce<{ name: string; total: number } | null>((best, g) => {
          const total = g.drillIds.reduce((s, did) => {
            const d = session.drills.find((x) => x.id === did);
            return s + (d?.timeCs ?? 0);
          }, 0);
          return !best || total < best.total ? { name: g.name, total } : best;
        }, null)
      : null;

  const dateLabel = relativeDate(session.date);
  const drillLabel = `${drillCount} drill${drillCount !== 1 ? 's' : ''}`;
  const groupLabel = groupCount > 0 ? ` · ${groupCount} group${groupCount !== 1 ? 's' : ''}` : '';

  return (
    <Pressable
      testID="session-card"
      style={styles.card}
      onPress={onClick}
      accessibilityLabel={`Session ${dateLabel}, ${drillLabel}`}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text style={styles.meta}>{drillLabel}{groupLabel}</Text>
        </View>

        {drillCount > 0 && (
          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text testID="session-total" style={styles.totalTime}>{csToTime(totalCs)}</Text>
          </View>
        )}
      </View>

      {bestGroup && (
        <View testID="best-group-row" style={styles.bestGroup}>
          <Text style={styles.bestGroupName}>★ {bestGroup.name}</Text>
          <Text style={styles.bestGroupTime}>{csToTime(bestGroup.total)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  date: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 3 },
  totalBlock: { alignItems: 'flex-end' },
  totalLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalTime: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontVariant: ['tabular-nums'], marginTop: 2 },
  bestGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ecfeff',
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  bestGroupName: { fontSize: 11, color: '#0e7490', fontWeight: '700' },
  bestGroupTime: { fontSize: 13, color: '#0e7490', fontWeight: '700', fontVariant: ['tabular-nums'] },
});
