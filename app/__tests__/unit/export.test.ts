import { sessionToCSV } from '../../lib/export/csv';
import { sessionToJSON } from '../../lib/export/json';
import { sessionToText } from '../../lib/export/text';
import type { Session } from '../../lib/types';

const session: Session = {
  id: 's1',
  date: '2026-05-13',
  notes: 'Good session',
  drills: [
    { id: 'd1', strokeId: 'fly',  distance: 25, timeCs: 1845, label: 'sprint', createdAt: '2026-05-13T10:00:00.000Z' },
    { id: 'd2', strokeId: 'back', distance: 50, timeCs: 3600, label: '',       createdAt: '2026-05-13T10:01:00.000Z' },
  ],
  groups: [{ id: 'g1', name: 'IM Set', drillIds: ['d1', 'd2'], createdAt: '' }],
  createdAt: '2026-05-13T10:00:00.000Z',
  updatedAt: '2026-05-13T10:05:00.000Z',
};

// ── CSV ───────────────────────────────────────────────────────────────────────
describe('sessionToCSV', () => {
  it('returns a string', () => {
    expect(typeof sessionToCSV(session)).toBe('string');
  });

  it('includes a header row', () => {
    const csv = sessionToCSV(session);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toMatch(/stroke/i);
    expect(firstLine).toMatch(/distance/i);
    expect(firstLine).toMatch(/time/i);
  });

  it('includes one data row per drill', () => {
    const lines = sessionToCSV(session).split('\n').filter(Boolean);
    // header + 2 drills
    expect(lines.length).toBe(3);
  });

  it('formats time as MM:SS.CC', () => {
    expect(sessionToCSV(session)).toMatch('00:18.45');
  });

  it('includes drill label when present', () => {
    expect(sessionToCSV(session)).toMatch('sprint');
  });
});

// ── JSON ──────────────────────────────────────────────────────────────────────
describe('sessionToJSON', () => {
  it('returns valid JSON string', () => {
    expect(() => JSON.parse(sessionToJSON(session))).not.toThrow();
  });

  it('round-trips the session', () => {
    const parsed = JSON.parse(sessionToJSON(session));
    expect(parsed.id).toBe(session.id);
    expect(parsed.drills).toHaveLength(2);
    expect(parsed.groups).toHaveLength(1);
  });
});

// ── Text ──────────────────────────────────────────────────────────────────────
describe('sessionToText', () => {
  it('returns a string', () => {
    expect(typeof sessionToText(session)).toBe('string');
  });

  it('includes the session date', () => {
    expect(sessionToText(session)).toMatch('2026-05-13');
  });

  it('includes stroke names', () => {
    const text = sessionToText(session);
    expect(text).toMatch(/Butterfly|fly/i);
    expect(text).toMatch(/Backstroke|back/i);
  });

  it('includes formatted times', () => {
    const text = sessionToText(session);
    expect(text).toMatch('00:18.45');
    expect(text).toMatch('00:36.00');
  });

  it('includes group name', () => {
    expect(sessionToText(session)).toMatch('IM Set');
  });
});
