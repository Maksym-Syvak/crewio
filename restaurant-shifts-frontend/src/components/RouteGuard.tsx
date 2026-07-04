import type { ReactNode } from 'react';
import type { UserRole } from '@/types';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { isAdminRole } from '@/utils/roles';

interface Props {
  children: ReactNode;
  roles?: UserRole[];
  adminOnly?: boolean;
}

export function RouteGuard({ children, roles, adminOnly }: Props) {
  const user = useAuthStore((s) => s.user);
  const workspaceRole = useAuthStore((s) => s.workspaceRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const effectiveRole = workspaceRole ?? user?.role ?? null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdminRole(effectiveRole)) {
    return <Navigate to="/403" replace />;
  }

  if (roles && effectiveRole && !roles.includes(effectiveRole)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
