import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../lib/SessionContext';
import { AuthProvider, useAuth } from '../lib/auth';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!user && !inAuthGroup) {
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SessionProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
            <Stack.Screen
              name="session/[id]"
              options={{ headerShown: true, title: 'Session', headerBackTitle: 'Home' }}
            />
          </Stack>
          <StatusBar style="auto" />
        </AuthGate>
      </SessionProvider>
    </AuthProvider>
  );
}
