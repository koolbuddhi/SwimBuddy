import { mergeSession } from '../../lib/sync/conflicts';
import type { Session } from '../../lib/types';

const make = (id: string, updatedAt: string, drills: Session['drills'] = [], notes = ''): Session => ({
  id, date: '2026-05-13', notes, drills, groups: [], createdAt: '2026-05-13T00:00:00Z', updatedAt,
});

describe('mergeSession', () => {
  it('returns server copy when server is newer', () => {
    const local = make('s1', '2026-05-13T10:00:00Z', [], 'local note');
    const server = make('s1', '2026-05-13T11:00:00Z', [], 'server note');
    expect(mergeSession(local, server).notes).toBe('server note');
  });

  it('returns local copy when local is newer', () => {
    const local = make('s1', '2026-05-13T12:00:00Z', [], 'local note');
    const server = make('s1', '2026-05-13T11:00:00Z', [], 'server note');
    expect(mergeSession(local, server).notes).toBe('local note');
  });

  it('merges drills by id (union of both)', () => {
    const d1 = { id: 'd1', strokeId: 'fly' as const, distance: 25, timeCs: 1000, label: '', createdAt: '' };
    const d2 = { id: 'd2', strokeId: 'back' as const, distance: 50, timeCs: 2000, label: '', createdAt: '' };
    const local = make('s1', '2026-05-13T10:00:00Z', [d1]);
    const server = make('s1', '2026-05-13T10:00:00Z', [d2]);
    const merged = mergeSession(local, server);
    expect(merged.drills.map((d) => d.id).sort()).toEqual(['d1', 'd2']);
  });

  it('server drill wins when same id, server is newer', () => {
    const d_local = { id: 'd1', strokeId: 'fly' as const, distance: 25, timeCs: 1000, label: 'local', createdAt: '2026-05-13T09:00:00Z' };
    const d_server = { id: 'd1', strokeId: 'fly' as const, distance: 25, timeCs: 2000, label: 'server', createdAt: '2026-05-13T11:00:00Z' };
    const local = make('s1', '2026-05-13T10:00:00Z', [d_local]);
    const server = make('s1', '2026-05-13T11:00:00Z', [d_server]);
    const merged = mergeSession(local, server);
    expect(merged.drills[0].label).toBe('server');
  });

  it('keeps local drill when same id but local createdAt is newer', () => {
    const d_local = { id: 'd1', strokeId: 'fly' as const, distance: 25, timeCs: 1000, label: 'local', createdAt: '2026-05-13T12:00:00Z' };
    const d_server = { id: 'd1', strokeId: 'fly' as const, distance: 25, timeCs: 2000, label: 'server', createdAt: '2026-05-13T10:00:00Z' };
    const local = make('s1', '2026-05-13T10:00:00Z', [d_local]);
    const server = make('s1', '2026-05-13T11:00:00Z', [d_server]);
    const merged = mergeSession(local, server);
    expect(merged.drills[0].label).toBe('local');
  });
});
