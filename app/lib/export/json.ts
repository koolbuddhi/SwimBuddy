import type { Session } from '../types';

export function sessionToJSON(session: Session): string {
  return JSON.stringify(session, null, 2);
}
