import type { EmployeeStatus } from '@/types';

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Активний',
  on_leave: 'Неактивний',
  terminated: 'Неактивний',
  temporarily_unavailable: 'Неактивний',
};

export function getEmployeeStatusLabel(status: EmployeeStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function isEmployeeActive(status: EmployeeStatus) {
  return status === 'active';
}

export function formatEmployeePhone(phone?: string | null, fallback?: string | null) {
  const value = phone?.trim() || fallback?.trim();
  if (!value) return '—';
  if (value.startsWith('+')) return value;
  if (value.startsWith('380')) return `+${value}`;
  if (value.startsWith('0')) return `+38${value}`;
  return value;
}

export function formatSalary(amount: number) {
  return `${Math.round(amount).toLocaleString('uk-UA')} грн`;
}

export function telegramProfileUrl(username?: string | null) {
  if (!username) return null;
  const clean = username.replace(/^@/, '');
  return `https://t.me/${clean}`;
}

export function telegramDisplayName(username?: string | null) {
  if (!username) return null;
  return username.startsWith('@') ? username : `@${username}`;
}
