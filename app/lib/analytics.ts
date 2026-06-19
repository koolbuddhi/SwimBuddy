import type { Drill, Session, StrokeId } from './types';

// ─── shared shapes ────────────────────────────────────────────────────────────

export interface PersonalBest {
  strokeId: StrokeId;
  distance: number;
  timeCs: number;
  drillId: string;
  sessionId: string;
  date: string;            // session.date (YYYY-MM-DD)
}

export interface TrendPoint {
  date: string;            // session.date of the swim
  timeCs: number;          // the actual swim time at this point
}

export interface StrokeBalanceEntry {
  strokeId: StrokeId;
  drillCount: number;
  totalDistance: number;   // metres
  percentage: number;      // share of the total volume, 0..100
}

// ─── helpers ──────────────────────────────────────────────────────────────────

interface EnrichedDrill {
  drill: Drill;
  session: Session;
}

function allDrills(sessions: Session[]): EnrichedDrill[] {
  return sessions.flatMap((session) => session.drills.map((drill) => ({ drill, session })));
}

function keyOf(d: { strokeId: StrokeId; distance: number }): string {
  return `${d.strokeId}-${d.distance}`;
}

// ─── personal bests ───────────────────────────────────────────────────────────

/**
 * One PB per (stroke × distance) combo across every drill in `sessions`.
 *
 * On a tie (same time), the EARLIER drill wins — "you set this best on X, you
 * haven't beaten it since" is what most parents want to read.
 */
export function personalBests(sessions: Session[]): PersonalBest[] {
  const best = new Map<string, PersonalBest>();
  for (const { drill, session } of allDrills(sessions)) {
    if (drill.timeCs <= 0) continue;
    const k = keyOf(drill);
    const existing = best.get(k);
    if (
      !existing ||
      drill.timeCs < existing.timeCs ||
      (drill.timeCs === existing.timeCs && session.date < existing.date)
    ) {
      best.set(k, {
        strokeId: drill.strokeId,
        distance: drill.distance,
        timeCs: drill.timeCs,
        drillId: drill.id,
        sessionId: session.id,
        date: session.date,
      });
    }
  }
  return Array.from(best.values()).sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.strokeId.localeCompare(b.strokeId);
  });
}

// ─── trend ────────────────────────────────────────────────────────────────────

/**
 * For a given (stroke × distance), return one point per session-date with the
 * BEST time on that day. Sorted chronologically. Sessions that don't contain
 * this event are skipped.
 *
 * The "best on the day" rather than "average" mirrors how coaches read a log —
 * the headline swim from each practice.
 */
export function trendByEvent(
  sessions: Session[],
  strokeId: StrokeId,
  distance: number,
): TrendPoint[] {
  const byDate = new Map<string, number>();
  for (const session of sessions) {
    for (const drill of session.drills) {
      if (drill.strokeId !== strokeId || drill.distance !== distance) continue;
      if (drill.timeCs <= 0) continue;
      const cur = byDate.get(session.date);
      if (cur === undefined || drill.timeCs < cur) {
        byDate.set(session.date, drill.timeCs);
      }
    }
  }
  return Array.from(byDate.entries())
    .map(([date, timeCs]) => ({ date, timeCs }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── improvement velocity ─────────────────────────────────────────────────────

/**
 * Slope of best-times-per-day for an event, in seconds per week, over the most
 * recent `windowDays`. Negative = getting faster (the goal); positive = slower.
 *
 * Computed via least-squares linear regression in `(daysFromStart, seconds)`
 * space. Returns null when there's fewer than 2 distinct days in the window —
 * a single point has no slope.
 */
export function improvementVelocity(
  sessions: Session[],
  strokeId: StrokeId,
  distance: number,
  windowDays = 56,                 // 8 weeks
  asOf: string = todayISO(),
): { secondsPerWeek: number; samples: number } | null {
  const allPts = trendByEvent(sessions, strokeId, distance);
  if (allPts.length < 2) return null;

  const asOfMs = parseISODate(asOf);
  const cutoff = asOfMs - windowDays * 24 * 60 * 60 * 1000;
  const inWindow = allPts.filter((p) => parseISODate(p.date) >= cutoff);
  if (inWindow.length < 2) return null;

  // Convert to (days-from-first, seconds).
  const t0 = parseISODate(inWindow[0].date);
  const xs = inWindow.map((p) => (parseISODate(p.date) - t0) / 86_400_000);
  const ys = inWindow.map((p) => p.timeCs / 100);
  const slope = leastSquaresSlope(xs, ys);
  if (slope === null) return null;

  return { secondsPerWeek: slope * 7, samples: inWindow.length };
}

function leastSquaresSlope(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return null;     // all points on the same day
  return num / den;
}

// ─── stroke balance ───────────────────────────────────────────────────────────

/**
 * Percentage of training volume per stroke. Volume = sum(distance × drill_count)
 * is a more honest measure than just drill count, because a 100m drill is much
 * more volume than a 25m drill.
 *
 * `sinceDate` filters to sessions on/after that date; omit for all-time.
 */
export function strokeBalance(
  sessions: Session[],
  sinceDate?: string,
): StrokeBalanceEntry[] {
  const totals: Record<StrokeId, { count: number; distance: number }> = {
    fly: { count: 0, distance: 0 },
    back: { count: 0, distance: 0 },
    breast: { count: 0, distance: 0 },
    free: { count: 0, distance: 0 },
    mixed: { count: 0, distance: 0 },
  };
  for (const session of sessions) {
    if (sinceDate && session.date < sinceDate) continue;
    for (const drill of session.drills) {
      totals[drill.strokeId].count += 1;
      totals[drill.strokeId].distance += drill.distance;
    }
  }
  const totalVolume = Object.values(totals).reduce((a, b) => a + b.distance, 0);
  return (Object.keys(totals) as StrokeId[]).map((strokeId) => {
    const t = totals[strokeId];
    const percentage = totalVolume === 0 ? 0 : (t.distance / totalVolume) * 100;
    return {
      strokeId,
      drillCount: t.count,
      totalDistance: t.distance,
      percentage,
    };
  });
}

// ─── totals ───────────────────────────────────────────────────────────────────

/**
 * Aggregate volume / count metrics for the "this month" tile.
 */
export function volumeSummary(
  sessions: Session[],
  sinceDate?: string,
): { sessionCount: number; drillCount: number; totalDistance: number; totalTimeCs: number } {
  let sessionCount = 0;
  let drillCount = 0;
  let totalDistance = 0;
  let totalTimeCs = 0;
  for (const session of sessions) {
    if (sinceDate && session.date < sinceDate) continue;
    sessionCount += 1;
    for (const drill of session.drills) {
      drillCount += 1;
      totalDistance += drill.distance;
      totalTimeCs += drill.timeCs;
    }
  }
  return { sessionCount, drillCount, totalDistance, totalTimeCs };
}

// ─── date helpers (kept local to avoid a circular import on lib/time) ─────────

function parseISODate(iso: string): number {
  // YYYY-MM-DD at local noon — avoids DST / off-by-one-day edges.
  return new Date(iso + 'T12:00:00').getTime();
}

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA');
}
