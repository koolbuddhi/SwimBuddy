import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function shareCSV(csvContent: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    downloadBlob(new Blob([csvContent], { type: 'text/csv' }), filename);
    return;
  }
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csvContent, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(path, { mimeType: 'text/csv' });
}

export async function shareFile(path: string, mimeType = 'application/octet-stream'): Promise<void> {
  if (Platform.OS === 'web') return;
  await Sharing.shareAsync(path, { mimeType });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
