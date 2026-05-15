import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SessionScreen } from '../../components/SessionScreen';

export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const handleBack = () => {
    // router.back() throws "GO_BACK was not handled" when the user landed on
    // this URL directly (no history). Fall through to an explicit home nav.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return <SessionScreen sessionId={id} onBack={handleBack} />;
}
