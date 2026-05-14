import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SessionScreen } from '../../components/SessionScreen';

export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <SessionScreen
      sessionId={id}
      onBack={() => router.back()}
    />
  );
}
