import {
  improvementVelocity,
  personalBests,
  strokeBalance,
  trendByEvent,
  volumeSummary,
} from '../../lib/analytics';
import type { Drill, Session, StrokeId } from '../../lib/types';

let drillCounter = 0;
function mkDrill(strokeId: StrokeId, distance: number, timeCs: number): Drill {
  drillCounter += 1;
  return {
    id: `d-${drillCounter}`,
    strokeId,
    distance,
    timeCs,
    label: '',
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function mkSession(date: string, drills: Drill[]): Session {
  return {
    id: `s-${date}`,
    date,
    notes: '',
    drills,
    groups: [],
    createdAt: `${date}T08:00:00Z`,
    updatedAt: `${date}T08:00:00Z`,
  };
}

beforeEach(() => {
  drillCounter = 0;
});

describe('personalBests', () => {
  it('returns one PB per (stroke × distance) combo', () => {
    const sessions = [
      mkSession('2026-05-10', [mkDrill('free', 50, 4000), mkDrill('back', 50, 5000)]),
      mkSession('2026-05-15', [mkDrill('free', 50, 3800)]),
      mkSession('2026-05-20', [mkDrill('free', 50, 3900), mkDrill('back', 50, 4800)]),
    ];
    const pbs = personalBests(sessions);
    expect(pbs).toHaveLength(2);
    const freePB = pbs.find((p) => p.strokeId === 'free');
    const backPB = pbs.find((p) => p.strokeId === 'back');
    expect(freePB?.timeCs).toBe(3800);
    expect(freePB?.date).toBe('2026-05-15');
    expect(backPB?.timeCs).toBe(4800);
  });

  it('breaks ties on the EARLIER date so "you set it on X and haven\'t beaten it" is honest', () => {
    const sessions = [
      mkSession('2026-05-20', [mkDrill('free', 50, 3500)]),
      mkSession('2026-05-10', [mkDrill('free', 50, 3500)]),
    ];
    const [pb] = personalBests(sessions);
    expect(pb.date).toBe('2026-05-10');
  });

  it('ignores drills with timeCs <= 0', () => {
    const sessions = [mkSession('2026-05-10', [mkDrill('free', 50, 0)])];
    expect(personalBests(sessions)).toEqual([]);
  });

  it('sorts by distance then strokeId for stable display', () => {
    const sessions = [
      mkSession('2026-05-10', [
        mkDrill('free', 100, 9000),
        mkDrill('back', 50, 5000),
        mkDrill('free', 50, 4000),
      ]),
    ];
    const pbs = personalBests(sessions);
    expect(pbs.map((p) => `${p.distance}-${p.strokeId}`)).toEqual([
      '50-back', '50-free', '100-free',
    ]);
  });
});

describe('trendByEvent', () => {
  it('returns one point per session-date with the best time on that day', () => {
    const sessions = [
      mkSession('2026-05-10', [
        mkDrill('free', 50, 4000),
        mkDrill('free', 50, 3800),       // better on the same day
      ]),
      mkSession('2026-05-15', [mkDrill('free', 50, 3900)]),
      mkSession('2026-05-12', [mkDrill('free', 50, 3950)]),
    ];
    const trend = trendByEvent(sessions, 'free', 50);
    expect(trend).toEqual([
      { date: '2026-05-10', timeCs: 3800 },
      { date: '2026-05-12', timeCs: 3950 },
      { date: '2026-05-15', timeCs: 3900 },
    ]);
  });

  it('returns empty when no drills match the event', () => {
    const sessions = [mkSession('2026-05-10', [mkDrill('free', 50, 3800)])];
    expect(trendByEvent(sessions, 'fly', 50)).toEqual([]);
  });

  it('skips drills with timeCs <= 0', () => {
    const sessions = [mkSession('2026-05-10', [mkDrill('free', 50, 0), mkDrill('free', 50, 3800)])];
    expect(trendByEvent(sessions, 'free', 50)).toEqual([{ date: '2026-05-10', timeCs: 3800 }]);
  });
});

describe('improvementVelocity', () => {
  it('returns null when there are fewer than 2 distinct days', () => {
    const sessions = [mkSession('2026-05-10', [mkDrill('free', 50, 4000)])];
    expect(improvementVelocity(sessions, 'free', 50, 56, '2026-05-30')).toBeNull();
  });

  it('returns negative seconds-per-week when the swimmer is getting faster', () => {
    // 7 days apart, 1s faster → -1 s/week.
    const sessions = [
      mkSession('2026-05-10', [mkDrill('free', 50, 4000)]),  // 40.00s
      mkSession('2026-05-17', [mkDrill('free', 50, 3900)]),  // 39.00s
    ];
    const v = improvementVelocity(sessions, 'free', 50, 56, '2026-05-20');
    expect(v).not.toBeNull();
    expect(v!.secondsPerWeek).toBeCloseTo(-1.0, 3);
    expect(v!.samples).toBe(2);
  });

  it('windows correctly — points outside the window are dropped', () => {
    const sessions = [
      mkSession('2026-01-01', [mkDrill('free', 50, 5000)]),  // way outside
      mkSession('2026-05-10', [mkDrill('free', 50, 4000)]),
      mkSession('2026-05-17', [mkDrill('free', 50, 3900)]),
    ];
    const v = improvementVelocity(sessions, 'free', 50, 56, '2026-05-20');
    expect(v!.samples).toBe(2);   // the January point is excluded
  });

  it('returns null when all in-window points fall on the same day', () => {
    const sessions = [
      mkSession('2026-05-10', [mkDrill('free', 50, 4000), mkDrill('free', 50, 3950)]),
    ];
    expect(improvementVelocity(sessions, 'free', 50, 56, '2026-05-20')).toBeNull();
  });
});

describe('strokeBalance', () => {
  it('calculates volume-weighted percentages across the five stroke ids', () => {
    const sessions = [
      mkSession('2026-05-10', [
        mkDrill('free', 100, 9000),
        mkDrill('back', 50, 5000),
        mkDrill('breast', 25, 3000),
        mkDrill('fly', 25, 3500),
      ]),
    ];
    const balance = strokeBalance(sessions);
    const total = 100 + 50 + 25 + 25;     // = 200m
    const free = balance.find((b) => b.strokeId === 'free')!;
    expect(free.totalDistance).toBe(100);
    expect(free.percentage).toBeCloseTo((100 / total) * 100, 3);
    expect(free.drillCount).toBe(1);
    const mixed = balance.find((b) => b.strokeId === 'mixed')!;
    expect(mixed.percentage).toBe(0);
  });

  it('returns zero percentages when no drills are logged', () => {
    expect(strokeBalance([]).every((b) => b.percentage === 0)).toBe(true);
  });

  it('respects sinceDate — earlier sessions are excluded', () => {
    const sessions = [
      mkSession('2026-04-30', [mkDrill('fly', 100, 9000)]),
      mkSession('2026-05-05', [mkDrill('free', 50, 4000)]),
    ];
    const recent = strokeBalance(sessions, '2026-05-01');
    expect(recent.find((b) => b.strokeId === 'fly')?.totalDistance).toBe(0);
    expect(recent.find((b) => b.strokeId === 'free')?.totalDistance).toBe(50);
  });
});

describe('volumeSummary', () => {
  it('aggregates sessions, drills, distance, and time across the period', () => {
    const sessions = [
      mkSession('2026-05-01', [mkDrill('free', 50, 4000), mkDrill('back', 25, 2500)]),
      mkSession('2026-05-08', [mkDrill('breast', 100, 8000)]),
    ];
    const s = volumeSummary(sessions);
    expect(s.sessionCount).toBe(2);
    expect(s.drillCount).toBe(3);
    expect(s.totalDistance).toBe(50 + 25 + 100);
    expect(s.totalTimeCs).toBe(4000 + 2500 + 8000);
  });

  it('returns zeros when no sessions match', () => {
    expect(volumeSummary([], '2026-01-01')).toEqual({
      sessionCount: 0, drillCount: 0, totalDistance: 0, totalTimeCs: 0,
    });
  });
});
