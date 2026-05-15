import * as XLSX from 'xlsx';
import { csToTime } from '../time';
import type { Session } from '../types';

const STROKE_NAMES: Record<string, string> = {
  fly: 'Butterfly', back: 'Backstroke', breast: 'Breaststroke', free: 'Freestyle', mixed: 'Mixed',
};

export async function sessionToExcel(session: Session): Promise<ArrayBuffer> {

  // Lookup: drill.id → group.name (so each drill row carries its group).
  const drillIdToGroup = new Map<string, string>();
  for (const g of session.groups) for (const id of g.drillIds) drillIdToGroup.set(id, g.name);

  // ── Sheet 1: Drills ─────────────────────────────────────────────────────────
  const drillRows = [
    ['Date', 'Stroke', 'Distance (m)', 'Time', 'Label', 'Group'],
    ...session.drills.map((d) => [
      session.date,
      STROKE_NAMES[d.strokeId] ?? d.strokeId,
      d.distance,
      csToTime(d.timeCs),
      d.label,
      drillIdToGroup.get(d.id) ?? '',
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

// Multi-session export — same three-sheet layout as sessionToExcel but each
// row is prefixed with the Date so multiple days can live in one workbook.
export async function sessionsToExcel(sessions: Session[]): Promise<ArrayBuffer> {
  const drillRows: unknown[][] = [['Date', 'Stroke', 'Distance (m)', 'Time', 'Label', 'Group']];
  const groupRows: unknown[][] = [['Date', 'Group', 'Stroke', 'Distance (m)', 'Time', 'Label']];
  const summaryRows: unknown[][] = [['Date', 'Drills', 'Groups', 'Total time']];

  let grandCs = 0;
  let grandDrills = 0;
  let grandGroups = 0;

  // Sort newest → oldest so the Summary sheet reads top-down by date.
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  for (const s of sorted) {
    const drillIdToGroup = new Map<string, string>();
    for (const g of s.groups) for (const id of g.drillIds) drillIdToGroup.set(id, g.name);

    for (const d of s.drills) {
      drillRows.push([
        s.date,
        STROKE_NAMES[d.strokeId] ?? d.strokeId,
        d.distance,
        csToTime(d.timeCs),
        d.label,
        drillIdToGroup.get(d.id) ?? '',
      ]);
    }

    for (const g of s.groups) {
      for (const drillId of g.drillIds) {
        const d = s.drills.find((x) => x.id === drillId);
        if (d) {
          groupRows.push([
            s.date,
            g.name,
            STROKE_NAMES[d.strokeId] ?? d.strokeId,
            d.distance,
            csToTime(d.timeCs),
            d.label,
          ]);
        }
      }
    }

    const totalCs = s.drills.reduce((sum, d) => sum + d.timeCs, 0);
    summaryRows.push([s.date, s.drills.length, s.groups.length, csToTime(totalCs)]);
    grandCs += totalCs;
    grandDrills += s.drills.length;
    grandGroups += s.groups.length;
  }

  summaryRows.push([]);
  summaryRows.push(['Total', grandDrills, grandGroups, csToTime(grandCs)]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(drillRows), 'Drills');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(groupRows), 'Groups');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
