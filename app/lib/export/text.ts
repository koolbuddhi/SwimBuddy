import { csToTime } from '../time';
import type { Session } from '../types';

const STROKE_NAMES: Record<string, string> = {
  fly: 'Butterfly', back: 'Backstroke', breast: 'Breaststroke', free: 'Freestyle', mixed: 'Mixed',
};

export function sessionToText(session: Session): string {
  const lines: string[] = [`SwimBuddy Session — ${session.date}`];

  if (session.notes) lines.push(`Notes: ${session.notes}`);
  lines.push('');

  // grouped drills
  for (const group of session.groups) {
    lines.push(`[ ${group.name} ]`);
    for (const drillId of group.drillIds) {
      const d = session.drills.find((x) => x.id === drillId);
      if (d) {
        const label = d.label ? ` (${d.label})` : '';
        lines.push(`  ${d.distance}m ${STROKE_NAMES[d.strokeId] ?? d.strokeId}${label}  ${csToTime(d.timeCs)}`);
      }
    }
    lines.push('');
  }

  // ungrouped drills
  const groupedIds = new Set(session.groups.flatMap((g) => g.drillIds));
  const ungrouped = session.drills.filter((d) => !groupedIds.has(d.id));
  if (ungrouped.length > 0) {
    for (const d of ungrouped) {
      const label = d.label ? ` (${d.label})` : '';
      lines.push(`${d.distance}m ${STROKE_NAMES[d.strokeId] ?? d.strokeId}${label}  ${csToTime(d.timeCs)}`);
    }
  }

  return lines.join('\n');
}
