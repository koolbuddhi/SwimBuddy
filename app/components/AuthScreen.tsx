import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { initGoogleAuth, promptOneTap, renderGoogleButton } from '../lib/auth/google.web';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8787';

function loadGisScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('GIS script failed to load')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.dataset.gis = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('GIS script failed to load'));
    document.head.appendChild(s);
  });
}

export function AuthScreen() {
  const { loading, signIn } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!CLIENT_ID) {
      setError('EXPO_PUBLIC_GOOGLE_CLIENT_ID is not set in app/.env');
      return;
    }
    loadGisScript()
      .then(() => {
        initGoogleAuth(CLIENT_ID, async ({ credential }) => {
          setSigningIn(true);
          setError(null);
          try {
            const r = await fetch(`${API_BASE}/auth/google`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: credential }),
            });
            const body = await r.json().catch(() => null);
            if (!r.ok) {
              throw new Error(`Sign-in failed (${r.status}): ${body?.detail ?? body?.error ?? 'unknown'}`);
            }
            await signIn({ id: body.id, email: body.email, name: body.name ?? body.email });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Sign-in failed');
            setSigningIn(false);
          }
        });
        setGisReady(true);
        // Also fire the FedCM-backed One Tap prompt. This doesn't need a popup;
        // Chrome shows its native account chooser (top-right) for signed-in users.
        try { promptOneTap(); } catch {/* prompt is best-effort */}
      })
      .catch((e) => setError(e.message));
  }, [signIn]);

  // Callback ref — fires the moment the div is mounted AND the SDK is ready.
  const mountGoogleButton = (el: HTMLDivElement | null) => {
    if (el && gisReady) renderGoogleButton(el);
  };

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

      {Platform.OS === 'web' ? (
        // Google's official rendered button — reliable click-to-sign-in.
        gisReady ? (
          React.createElement('div', {
            ref: mountGoogleButton,
            'data-testid': 'google-rendered-btn',
            style: { minHeight: 44 },
          })
        ) : (
          <ActivityIndicator size="small" color="#0ea5e9" />
        )
      ) : (
        <Pressable
          testID="auth-signin-btn"
          style={[styles.googleBtn, signingIn && styles.googleBtnDisabled]}
          accessibilityLabel="Sign in with Google"
          disabled={signingIn || !CLIENT_ID}
          onPress={() => promptOneTap()}
        >
          <Text style={styles.googleBtnText}>
            {signingIn ? 'Signing in…' : 'Sign in with Google'}
          </Text>
        </Pressable>
      )}

      {signingIn && (
        <Text testID="auth-status" style={styles.subtitle}>Signing in…</Text>
      )}
      {error && <Text testID="auth-error" style={styles.error}>{error}</Text>}
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
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  error: { fontSize: 13, color: '#dc2626', maxWidth: 280, textAlign: 'center', paddingHorizontal: 16 },
});
