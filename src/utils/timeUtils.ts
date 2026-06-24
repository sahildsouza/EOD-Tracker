import { differenceInMinutes, parseISO, isAfter, isBefore, isEqual, addDays, format } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { IST_TIMEZONE } from './dateUtils';

export interface LogEntry {
  id: string;
  user_id: string;
  date: string;
  category: string;
  title: string;
  from_time: string; // ISO string
  to_time: string; // ISO string
  duration_minutes: number;
  notes: string | null;
}

export function calculateMergedMinutes(entries: { from: Date; to: Date }[]): number {
  if (entries.length === 0) return 0;
  
  // Sort intervals by start time
  const sorted = [...entries].sort((a, b) => a.from.getTime() - b.from.getTime());
  
  let totalMinutes = 0;
  let currentStart = sorted[0].from;
  let currentEnd = sorted[0].to;

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (isBefore(next.from, currentEnd) || isEqual(next.from, currentEnd)) {
      // Overlapping or touching, extend currentEnd if needed
      if (isAfter(next.to, currentEnd)) {
        currentEnd = next.to;
      }
    } else {
      // Disjoint interval
      totalMinutes += differenceInMinutes(currentEnd, currentStart);
      currentStart = next.from;
      currentEnd = next.to;
    }
  }
  
  totalMinutes += differenceInMinutes(currentEnd, currentStart);
  return totalMinutes;
}

export function isDateLocked(targetDate: string): boolean {
  // targetDate is 'YYYY-MM-DD'
  const istNow = toDate(new Date(), { timeZone: IST_TIMEZONE });
  // Cutoff is 10 AM IST the day AFTER targetDate
  const targetDateObj = parseISO(targetDate);
  const cutoff = addDays(targetDateObj, 1);
  cutoff.setHours(10, 0, 0, 0); // 10:00 AM local (we treat it as IST)
  
  // Actually, since targetDateObj is at 00:00 local, let's build the exact cutoff in IST.
  // Using date-fns-tz:
  const cutoffIsoStr = `${format(addDays(parseISO(targetDate), 1), 'yyyy-MM-dd')}T10:00:00+05:30`;
  const exactCutoff = new Date(cutoffIsoStr);
  
  return isAfter(new Date(), exactCutoff);
}
