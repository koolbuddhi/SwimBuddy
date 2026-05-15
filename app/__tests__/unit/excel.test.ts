/**
 * Unit tests for lib/export/excel.ts.
 * SheetJS (xlsx) is mocked so we avoid loading a 250KB library in Node tests.
 */

jest.mock('xlsx', () => {
  const aoa_to_sheet = jest.fn(() => ({}));
  const book_new = jest.fn(() => ({ SheetNames: [], Sheets: {} }));
  const book_append_sheet = jest.fn((wb: { SheetNames: string[]; Sheets: Record<string, unknown> }, ws: unknown, name: string) => {
    wb.SheetNames.push(name);
    wb.Sheets[name] = ws;
  });
  const write = jest.fn(() => new ArrayBuffer(8));
  return { utils: { aoa_to_sheet, book_new, book_append_sheet }, write };
});

const xlsxMock = jest.requireMock('xlsx') as {
  utils: { aoa_to_sheet: jest.Mock; book_new: jest.Mock; book_append_sheet: jest.Mock };
  write: jest.Mock;
};

import { sessionToExcel, sessionsToExcel } from '../../lib/export/excel';
import type { Session } from '../../lib/types';

const session: Session = {
  id: 's1',
  date: '2026-05-13',
  notes: 'Good session',
  drills: [
    { id: 'd1', strokeId: 'fly',  distance: 25, timeCs: 1845, label: 'sprint', createdAt: '' },
    { id: 'd2', strokeId: 'back', distance: 50, timeCs: 3600, label: '',       createdAt: '' },
  ],
  groups: [{ id: 'g1', name: 'IM Set', drillIds: ['d1', 'd2'], createdAt: '' }],
  createdAt: '',
  updatedAt: '',
};

describe('sessionToExcel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an ArrayBuffer', async () => {
const result = await sessionToExcel(session);
    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('calls write with xlsx type', async () => {
await sessionToExcel(session);
    expect(xlsxMock.write).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'array', bookType: 'xlsx' }));
  });

  it('creates a workbook with 3 sheets', async () => {
await sessionToExcel(session);
    const wb = xlsxMock.utils.book_new.mock.results[0].value as { SheetNames: string[] };
    expect(wb.SheetNames).toHaveLength(3);
  });

  it('sheet names include Drills, Groups, Summary', async () => {
await sessionToExcel(session);
    const wb = xlsxMock.utils.book_new.mock.results[0].value as { SheetNames: string[] };
    expect(wb.SheetNames).toContain('Drills');
    expect(wb.SheetNames).toContain('Groups');
    expect(wb.SheetNames).toContain('Summary');
  });

  it('Drills sheet includes a Group column with the group name per drill', async () => {
    await sessionToExcel(session);
    // The first call to aoa_to_sheet builds the Drills sheet; grab its rows.
    const drillsAoa = xlsxMock.utils.aoa_to_sheet.mock.calls[0][0] as unknown[][];
    expect(drillsAoa[0]).toEqual(['Date', 'Stroke', 'Distance (m)', 'Time', 'Label', 'Group']);
    // Both drills are in the IM Set group → both rows should carry that name.
    expect(drillsAoa[1][5]).toBe('IM Set');
    expect(drillsAoa[2][5]).toBe('IM Set');
  });
});

describe('sessionsToExcel (multi-session bulk export)', () => {
  const s1: Session = {
    id: 's1', date: '2026-05-15', notes: '', createdAt: '', updatedAt: '',
    drills: [{ id: 'd1', strokeId: 'fly', distance: 25, timeCs: 1845, label: '', createdAt: '' }],
    groups: [],
  };
  const s2: Session = {
    id: 's2', date: '2026-05-12', notes: '', createdAt: '', updatedAt: '',
    drills: [
      { id: 'd2', strokeId: 'back', distance: 50, timeCs: 3000, label: '', createdAt: '' },
      { id: 'd3', strokeId: 'free', distance: 25, timeCs: 1500, label: '', createdAt: '' },
    ],
    groups: [{ id: 'g1', name: 'IM', drillIds: ['d2', 'd3'], createdAt: '' }],
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates a workbook with Drills, Groups, and Summary sheets', async () => {
    await sessionsToExcel([s1, s2]);
    const wb = xlsxMock.utils.book_new.mock.results[0].value as { SheetNames: string[] };
    expect(wb.SheetNames).toEqual(['Drills', 'Groups', 'Summary']);
  });

  it('Drills sheet prefixes every row with the session Date and includes Group', async () => {
    await sessionsToExcel([s1, s2]);
    const drillsAoa = xlsxMock.utils.aoa_to_sheet.mock.calls[0][0] as unknown[][];
    expect(drillsAoa[0]).toEqual(['Date', 'Stroke', 'Distance (m)', 'Time', 'Label', 'Group']);
    // s1 sorts before s2 because of newest-first sort.
    expect(drillsAoa[1][0]).toBe('2026-05-15');
    expect(drillsAoa[2][0]).toBe('2026-05-12');
    expect(drillsAoa[2][5]).toBe('IM'); // d2 is in the IM group
  });

  it('Summary sheet has a per-day row and a grand-total row', async () => {
    await sessionsToExcel([s1, s2]);
    // 3rd aoa_to_sheet call is the Summary sheet
    const summaryAoa = xlsxMock.utils.aoa_to_sheet.mock.calls[2][0] as unknown[][];
    expect(summaryAoa[0]).toEqual(['Date', 'Drills', 'Groups', 'Total time']);
    // 1 header + 2 sessions + 1 blank + 1 total = 5 rows
    expect(summaryAoa.length).toBe(5);
    expect(summaryAoa[summaryAoa.length - 1][0]).toBe('Total');
  });
});
