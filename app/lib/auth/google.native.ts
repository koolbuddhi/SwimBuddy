import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required for expo-auth-session on native
WebBrowser.maybeCompleteAuthSession();

interface UseGoogleSignInOptions {
  clientId: string;
  onSuccess: (idToken: string) => void;
}

interface UseGoogleSignInResult {
  promptAsync: () => void;
}

export function useGoogleSignIn({ clientId, onSuccess }: UseGoogleSignInOptions): UseGoogleSignInResult {
  const [, response, promptAsync] = Google.useAuthRequest({ clientId });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token as string | undefined;
      if (idToken) onSuccess(idToken);
    }
  }, [response]);

  return { promptAsync: promptAsync as () => void };
}
