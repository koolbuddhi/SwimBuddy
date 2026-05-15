import { Alert, Platform } from 'react-native';

// React Native Web's Alert.alert is a no-op — the destructive button's
// onPress never fires, so confirmation dialogs silently swallow the action.
// This helper falls back to window.confirm() on web (where it's synchronous
// and reliable) and uses the real Alert.alert on native.
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Delete',
): void {
  if (Platform.OS === 'web') {
    // Browsers may strip the title from window.confirm(), so embed it in
    // the message for context.
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
