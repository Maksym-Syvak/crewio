import dayjs from 'dayjs';
import 'dayjs/locale/uk';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('uk');

export { dayjs };

export function formatDate(iso: string) {
  return dayjs(iso).format('D MMMM YYYY');
}

export function formatTime(iso: string) {
  return dayjs(iso).format('HH:mm');
}

export function formatDateTime(iso: string) {
  return dayjs(iso).format('D MMM, HH:mm');
}

export function formatMonth(month?: string) {
  return dayjs(month ?? undefined).format('YYYY-MM');
}

export function shiftDurationHours(start: string, end: string) {
  return dayjs(end).diff(dayjs(start), 'hour', true);
}

export function isSameDay(a: string, b: string) {
  return dayjs(a).isSame(dayjs(b), 'day');
}
