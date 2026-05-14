import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useSession } from '../lib/SessionContext';
import { sessionToCSV } from '../lib/export/csv';
import { sessionToJSON } from '../lib/export/json';
import { shareCSV } from '../lib/export/share';

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { sessions } = useSession();

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

      {/* Export section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export</Text>
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
  btnText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
});
