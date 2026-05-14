import { Platform } from 'react-native';
import type { LocalDB } from '../types';

// Resolved at module load time so callers get a stable reference.
// We use require() for the platform branch so Metro can tree-shake
// the unused platform's code at bundle time.
export const localDB: LocalDB =
  Platform.OS === 'web'
    ? (require('./web').createWebDB() as LocalDB)
    : (require('./native').nativeDB as LocalDB);
