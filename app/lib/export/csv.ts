import { csToTime } from '../time';
import type { Session } from '../types';

const STROKE_NAMES: Record<string, string> = {
  fly: 'Butterfly', back: 'Backstroke', breast: 'Breaststroke', free: 'Freestyle', mixed: 'Mixed',
};

export function sessionToCSV(session: Session): string {
  const header = 'Date,Stroke,Distance (m),Time,Label';
  const rows = session.drills.map((d) =>
    [
      session.date,
      STROKE_NAMES[d.strokeId] ?? d.strokeId,
      d.distance,
      csToTime(d.timeCs),
      d.label,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
