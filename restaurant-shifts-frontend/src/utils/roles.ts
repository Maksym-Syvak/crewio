import type { UserRole } from '@/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Власник',
  admin: 'Адміністратор',
  employee: 'Працівник',
};

export function isAdminRole(role: UserRole) {
  return role === 'owner' || role === 'admin';
}

export function canManageStaff(role: UserRole) {
  return isAdminRole(role);
}

export function canManageShifts(role: UserRole) {
  return isAdminRole(role);
}
