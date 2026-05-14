// This file is the Jest fallback. Metro resolves index.web.ts / index.native.ts
// for the actual app bundle — tests mock this module entirely.
import { nativeDB } from './native';
export const localDB = nativeDB;
