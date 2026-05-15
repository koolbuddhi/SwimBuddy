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

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function shareBinary(buffer: ArrayBuffer, filename: string, mimeType = XLSX_MIME): Promise<void> {
  if (Platform.OS === 'web') {
    downloadBlob(new Blob([buffer], { type: mimeType }), filename);
    return;
  }
  // Native: base64-encode then write the file.
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // btoa is available in Hermes and on web.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base64 = (globalThis as any).btoa(bin);
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
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
