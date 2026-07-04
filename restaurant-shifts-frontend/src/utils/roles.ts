import type { UserRole } from '@/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Власник',
  admin: 'Адміністратор',
  employee: 'Працівник',
};

export function isAdminRole(role: UserRole | null | undefined) {
  return role === 'owner' || role === 'admin';
}

export function canManageStaff(role: UserRole | null | undefined) {
  return isAdminRole(role);
}

export function getEffectiveRole(
  workspaceRole: UserRole | null | undefined,
  globalRole: UserRole | null | undefined,
): UserRole {
  return workspaceRole ?? globalRole ?? 'employee';
}
