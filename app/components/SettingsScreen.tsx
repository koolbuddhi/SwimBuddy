import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useSession } from '../lib/SessionContext';
import { sessionToCSV } from '../lib/export/csv';
import { sessionToJSON } from '../lib/export/json';
import { sessionsToExcel } from '../lib/export/excel';
import { shareCSV, shareBinary } from '../lib/export/share';
import { SharingPanel } from './SharingPanel';

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { sessions, sync, syncing, pendingCount } = useSession();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleExportCSV = async () => {
    if (sessions.length === 0) {
      Alert.alert('No sessions', 'Log some sessions before exporting.');
      return;
    }
    const csv = sessions.map(sessionToCSV).join('\n\n');
    await shareCSV(csv, 'swimbuddy_export.csv');
  };

  const handleExportJSON = async () => {
    if (sessions.length === 0) {
      Alert.alert('No sessions', 'Log some sessions before exporting.');
      return;
    }
    const json = JSON.stringify(sessions.map(sessionToJSON), null, 2);
    await shareCSV(json, 'swimbuddy_export.json');
  };

  const handleExportExcel = async () => {
    // Only the last 10 days' worth of sessions — keeps the export tight and
    // matches the "log your week" mental model the user wants to share.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 9); // 10 days INCLUDING today
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    const recent = sessions.filter((s) => s.date >= cutoffISO);
    if (recent.length === 0) {
      Alert.alert('No recent sessions', 'No sessions found in the last 10 days.');
      return;
    }
    try {
      const buffer = await sessionsToExcel(recent);
      await shareBinary(buffer, 'swimbuddy_last10days.xlsx');
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {user && (
          <View style={styles.row}>
            <Text style={styles.label}>{user.name}</Text>
            <Text style={styles.sublabel}>{user.email}</Text>
          </View>
        )}
        <Pressable testID="settings-signout-btn" style={styles.btn} onPress={handleSignOut}>
          <Text style={styles.btnText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Sync section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync</Text>
        <View style={styles.row}>
          <Text style={styles.sublabel}>
            {pendingCount > 0
              ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to upload`
              : 'All changes synced'}
          </Text>
        </View>
        <Pressable
          testID="settings-sync-btn"
          style={[styles.btn, syncing && styles.btnDisabled]}
          onPress={sync}
          disabled={syncing}
        >
          <Text style={styles.btnText}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
        </Pressable>
      </View>

      <SharingPanel />

      {/* Export section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export</Text>
        <Pressable testID="export-excel-btn" style={styles.btn} onPress={handleExportExcel}>
          <Text style={styles.btnText}>Export last 10 days as Excel</Text>
        </Pressable>
        <Pressable testID="export-csv-btn" style={styles.btn} onPress={handleExportCSV}>
          <Text style={styles.btnText}>Export as CSV</Text>
        </Pressable>
        <Pressable testID="export-json-btn" style={styles.btn} onPress={handleExportJSON}>
          <Text style={styles.btnText}>Export as JSON</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 24 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { gap: 2 },
  label: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  sublabel: { fontSize: 13, color: '#64748b' },
  btn: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
});
