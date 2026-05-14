import {
  csToTime,
  formatTimeInput,
  digToCs,
  csToDig,
  todayISO,
  isToday,
  isYesterday,
  relativeDate,
} from '../../lib/time';

describe('csToTime', () => {
  it('formats zero as 00:00.00', () => {
    expect(csToTime(0)).toBe('00:00.00');
  });

  it('formats 3045 cs as 00:30.45', () => {
    expect(csToTime(3045)).toBe('00:30.45');
  });

  it('formats exactly 1 minute (6000 cs)', () => {
    expect(csToTime(6000)).toBe('01:00.00');
  });

  it('formats an IM total around 82 seconds', () => {
    // 1845 + 2210 + 2540 + 1620 = 8215 cs = 01:22.15
    expect(csToTime(8215)).toBe('01:22.15');
  });

  it('formats large values (no hour cap)', () => {
    expect(csToTime(360000)).toBe('60:00.00');
  });

  it('pads single-digit seconds', () => {
    expect(csToTime(100)).toBe('00:01.00');
  });

  it('pads single-digit centiseconds', () => {
    expect(csToTime(101)).toBe('00:01.01');
  });
});

describe('formatTimeInput', () => {
  it('returns 00:00.00 for empty string', () => {
    expect(formatTimeInput('')).toBe('00:00.00');
  });

  it('returns 00:00.00 for "0"', () => {
    expect(formatTimeInput('0')).toBe('00:00.00');
  });

  it('formats "3045" as 00:30.45', () => {
    expect(formatTimeInput('3045')).toBe('00:30.45');
  });

  it('formats "10000" as 01:00.00', () => {
    expect(formatTimeInput('10000')).toBe('01:00.00');
  });

  it('formats 6-digit string', () => {
    expect(formatTimeInput('012345')).toBe('01:23.45');
  });

  it('caps at 6 digits (takes last 6)', () => {
    // "9999999" → last 6 = "999999" → 99:99.99
    expect(formatTimeInput('9999999')).toBe('99:99.99');
  });

  it('left-pads short strings', () => {
    expect(formatTimeInput('5')).toBe('00:00.05');
  });
});

describe('digToCs', () => {
  it('converts "3045" → 3045cs (30.45 s)', () => {
    expect(digToCs('3045')).toBe(3045);
  });

  it('converts "010000" → 6000cs (1:00.00)', () => {
    // key case: 01 min × 6000 + 00 s × 100 + 00 = 6000
    expect(digToCs('010000')).toBe(6000);
  });

  it('converts "013000" → 9000cs (1:30.00)', () => {
    expect(digToCs('013000')).toBe(9000);
  });

  it('converts "012345" → 1:23.45 = 8345cs', () => {
    // 1×6000 + 23×100 + 45 = 6000 + 2300 + 45 = 8345
    expect(digToCs('012345')).toBe(8345);
  });

  it('converts empty/zero → 0', () => {
    expect(digToCs('')).toBe(0);
    expect(digToCs('0')).toBe(0);
  });

  it('rounds-trip correctly with csToDig', () => {
    const cases = [3045, 6000, 9000, 8345, 100, 59999];
    for (const cs of cases) {
      expect(digToCs(csToDig(cs))).toBe(cs);
    }
  });
});

describe('csToDig', () => {
  it('converts 3045cs → "003045"', () => {
    expect(csToDig(3045)).toBe('003045');
  });

  it('converts 6000cs (1:00.00) → "010000"', () => {
    expect(csToDig(6000)).toBe('010000');
  });

  it('converts 9000cs (1:30.00) → "013000"', () => {
    expect(csToDig(9000)).toBe('013000');
  });

  it('returns empty string for 0 or negative', () => {
    expect(csToDig(0)).toBe('');
    expect(csToDig(-1)).toBe('');
  });
});

describe('todayISO', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isToday / isYesterday', () => {
  it('returns true for today ISO', () => {
    expect(isToday(todayISO())).toBe(true);
  });

  it('returns false for yesterday ISO', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(isToday(d.toLocaleDateString('en-CA'))).toBe(false);
  });

  it('isYesterday returns true for yesterday', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(isYesterday(d.toLocaleDateString('en-CA'))).toBe(true);
  });

  it('isYesterday returns false for today', () => {
    expect(isYesterday(todayISO())).toBe(false);
  });
});

describe('relativeDate', () => {
  it('returns "Today" for today', () => {
    expect(relativeDate(todayISO())).toBe('Today');
  });

  it('returns "Yesterday" for yesterday', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(relativeDate(d.toLocaleDateString('en-CA'))).toBe('Yesterday');
  });

  it('returns a formatted date for older dates', () => {
    expect(relativeDate('2024-01-15')).toMatch(/Jan/);
  });
});
