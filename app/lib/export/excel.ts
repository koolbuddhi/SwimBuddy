import * as XLSX from 'xlsx';
import { csToTime } from '../time';
import type { Session } from '../types';

const STROKE_NAMES: Record<string, string> = {
  fly: 'Butterfly', back: 'Backstroke', breast: 'Breaststroke', free: 'Freestyle', mixed: 'Mixed',
};

export async function sessionToExcel(session: Session): Promise<ArrayBuffer> {

  // ── Sheet 1: Drills ─────────────────────────────────────────────────────────
  const drillRows = [
    ['Date', 'Stroke', 'Distance (m)', 'Time', 'Label'],
    ...session.drills.map((d) => [
      session.date,
      STROKE_NAMES[d.strokeId] ?? d.strokeId,
      d.distance,
      csToTime(d.timeCs),
      d.label,
    ]),
  ];

  // ── Sheet 2: Groups ─────────────────────────────────────────────────────────
  const groupRows: unknown[][] = [['Group', 'Stroke', 'Distance (m)', 'Time', 'Label']];
  for (const g of session.groups) {
    for (const drillId of g.drillIds) {
      const d = session.drills.find((x) => x.id === drillId);
      if (d) {
        groupRows.push([
          g.name,
          STROKE_NAMES[d.strokeId] ?? d.strokeId,
          d.distance,
          csToTime(d.timeCs),
          d.label,
        ]);
      }
    }
  }

  // ── Sheet 3: Summary ────────────────────────────────────────────────────────
  const totalCs = session.drills.reduce((s, d) => s + d.timeCs, 0);
  const summaryRows = [
    ['Date', session.date],
    ['Total drills', session.drills.length],
    ['Total time', csToTime(totalCs)],
    ['Groups', session.groups.length],
    ['Notes', session.notes],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(drillRows), 'Drills');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(groupRows), 'Groups');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
