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

import { sessionToExcel } from '../../lib/export/excel';
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
});
