// Hardcoded Solar and Lunar Eclipses (2026 - 2030)
// Strictly educational historical lookup.

export interface EclipseEvent {
  date: string; // YYYY-MM-DD
  type: 'solar' | 'lunar';
  description: string;
}

export const ECLIPSE_EVENTS: EclipseEvent[] = [
  // 2026
  { date: '2026-02-17', type: 'solar', description: 'Annular Solar Eclipse' },
  { date: '2026-03-03', type: 'lunar', description: 'Total Lunar Eclipse' },
  { date: '2026-08-12', type: 'solar', description: 'Total Solar Eclipse' },
  { date: '2026-08-28', type: 'lunar', description: 'Partial Lunar Eclipse' },
  // 2027
  { date: '2027-02-06', type: 'solar', description: 'Annular Solar Eclipse' },
  { date: '2027-02-20', type: 'lunar', description: 'Penumbral Lunar Eclipse' },
  { date: '2027-07-18', type: 'lunar', description: 'Penumbral Lunar Eclipse' },
  { date: '2027-08-02', type: 'solar', description: 'Total Solar Eclipse' },
  { date: '2027-08-17', type: 'lunar', description: 'Penumbral Lunar Eclipse' },
  // 2028
  { date: '2028-01-12', type: 'lunar', description: 'Partial Lunar Eclipse' },
  { date: '2028-01-26', type: 'solar', description: 'Annular Solar Eclipse' },
  { date: '2028-07-06', type: 'lunar', description: 'Partial Lunar Eclipse' },
  { date: '2028-07-22', type: 'solar', description: 'Total Solar Eclipse' },
  // 2029
  { date: '2029-01-26', type: 'solar', description: 'Partial Solar Eclipse' },
  { date: '2029-02-28', type: 'lunar', description: 'Total Lunar Eclipse' },
  { date: '2029-07-11', type: 'solar', description: 'Partial Solar Eclipse' },
  { date: '2029-08-24', type: 'lunar', description: 'Total Lunar Eclipse' },
  // 2030
  { date: '2030-02-01', type: 'solar', description: 'Annular Solar Eclipse' },
  { date: '2030-06-01', type: 'solar', description: 'Annular Solar Eclipse' },
  { date: '2030-06-15', type: 'lunar', description: 'Partial Lunar Eclipse' },
  { date: '2030-11-25', type: 'solar', description: 'Total Solar Eclipse' },
  { date: '2030-12-09', type: 'lunar', description: 'Total Lunar Eclipse' }
];

/**
 * Returns eclipses occurring in a date range (inclusive).
 */
export function getEclipsesInRange(fromDate: string, toDate: string): EclipseEvent[] {
  const from = new Date(fromDate).getTime();
  const to = new Date(toDate).getTime();
  return ECLIPSE_EVENTS.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= from && t <= to;
  });
}
