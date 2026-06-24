import { formatInTimeZone, toDate } from 'date-fns-tz';

export const IST_TIMEZONE = 'Asia/Kolkata';

export function getCurrentDateIST(): string {
  return formatInTimeZone(new Date(), IST_TIMEZONE, 'yyyy-MM-dd');
}

export function getCurrentTimeIST(): string {
  return formatInTimeZone(new Date(), IST_TIMEZONE, 'HH:mm:ss');
}

export function formatDateTimeIST(dateStr: string): string {
  return formatInTimeZone(new Date(dateStr), IST_TIMEZONE, 'dd MMM yyyy, hh:mm a');
}
