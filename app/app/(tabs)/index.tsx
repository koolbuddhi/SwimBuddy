import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { HomeScreen } from '../../components/HomeScreen';
import { SwimmerSwitcher } from '../../components/SwimmerSwitcher';
import { SharedViewBanner } from '../../components/SharedViewBanner';
import { useSession } from '../../lib/SessionContext';
import { useViewingPermission } from '../../lib/useViewingPermission';

export default function HomeRoute() {
  const router = useRouter();
  const { sessions, createSession, sync, syncing } = useSession();
  const permission = useViewingPermission();

  const handleNewSession = async () => {
    const session = await createSession();
    router.push(`/session/${session.id}`);
  };

  // The Home FAB creates a new session under the current user. When viewing
  // someone else's log via a share, that wouldn't show up in the filtered list
  // (different ownerId), so hiding the FAB avoids confusion. Returning to "Me"
  // re-enables it via the swimmer switcher.
  const showFab = permission === 'owner';

  return (
    <View style={{ flex: 1 }}>
      <SwimmerSwitcher />
      <SharedViewBanner />
      <HomeScreen
        sessions={sessions}
        onOpenSession={(id) => router.push(`/session/${id}`)}
        onNewSession={handleNewSession}
        onRefresh={sync}
        refreshing={syncing}
        showFab={showFab}
        viewingShared={permission !== 'owner'}
      />
    </View>
  );
}
