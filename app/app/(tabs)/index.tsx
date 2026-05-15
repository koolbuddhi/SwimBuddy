import React from 'react';
import { useRouter } from 'expo-router';
import { HomeScreen } from '../../components/HomeScreen';
import { useSession } from '../../lib/SessionContext';

export default function HomeRoute() {
  const router = useRouter();
  const { sessions, createSession, sync, syncing } = useSession();

  const handleNewSession = async () => {
    const session = await createSession();
    router.push(`/session/${session.id}`);
  };

  return (
    <HomeScreen
      sessions={sessions}
      onOpenSession={(id) => router.push(`/session/${id}`)}
      onNewSession={handleNewSession}
      onRefresh={sync}
      refreshing={syncing}
    />
  );
}
