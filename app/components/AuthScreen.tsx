import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';

export function AuthScreen() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="auth-loading" size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>SwimBuddy</Text>
      <Text style={styles.subtitle}>Log your swim sessions</Text>

      <Pressable
        testID="auth-signin-btn"
        style={styles.googleBtn}
        accessibilityLabel="Sign in with Google"
      >
        <Text style={styles.googleBtnText}>Sign in with Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b' },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
});
