import type { Drill, Session } from '../types';

export function mergeSession(local: Session, server: Session): Session {
  // Merge drills by ID — newer createdAt wins per drill
  const drillMap = new Map<string, Drill>();

  for (const d of local.drills) drillMap.set(d.id, d);
  for (const d of server.drills) {
    const existing = drillMap.get(d.id);
    if (!existing || d.createdAt > existing.createdAt) {
      drillMap.set(d.id, d);
    }
  }

  const drills = Array.from(drillMap.values());

  // Use the session metadata from whichever side has the newer updatedAt
  const base = server.updatedAt >= local.updatedAt ? server : local;

  return { ...base, drills };
}
