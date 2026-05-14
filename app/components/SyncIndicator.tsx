import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SyncStatus } from '../lib/types';

interface SyncIndicatorProps {
  status: SyncStatus;
}

export function SyncIndicator({ status }: SyncIndicatorProps) {
  const { state, pendingCount, errorMessage } = status;

  if (state === 'synced' && pendingCount === 0) return null;

  const label =
    state === 'error' ? `Sync error${errorMessage ? ': ' + errorMessage : ''}` :
    state === 'offline' ? `Offline — ${pendingCount} pending` :
    state === 'syncing' ? `Syncing… ${pendingCount} pending` :
    `${pendingCount} pending`;

  const color =
    state === 'error' ? '#dc2626' :
    state === 'offline' ? '#f59e0b' :
    '#0ea5e9';

  return (
    <View testID="sync-indicator" style={[styles.bar, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 4, paddingHorizontal: 16, alignItems: 'center' },
  text: { fontSize: 11, color: '#fff', fontWeight: '600' },
});
