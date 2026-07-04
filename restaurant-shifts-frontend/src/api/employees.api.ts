import { api } from './client';
import type {
  Employee,
  EmployeeProfile,
  PaginatedResponse,
  Restaurant,
  UserRole,
  Workspace,
} from '@/types';

export const employeesApi = {
  me: (restaurantId?: string) =>
    api
      .get<{ employee: Employee | null; restaurant: Restaurant | null }>(
        '/employees/me',
        { params: restaurantId ? { restaurantId } : undefined },
      )
      .then((r) => r.data),

  workspaces: () =>
    api.get<Workspace[]>('/employees/workspaces').then((r) => r.data),

  list: (restaurantId?: string, page = 1, limit = 20) =>
    api
      .get<PaginatedResponse<Employee>>('/employees', {
        params: { restaurantId, page, limit },
      })
      .then((r) => r.data),

  profile: (employeeId: string) =>
    api.get<EmployeeProfile>(`/employees/${employeeId}/profile`).then((r) => r.data),

  update: (
    employeeId: string,
    payload: {
      position_id?: string | null;
      member_role?: 'employee' | 'admin';
    },
  ) =>
    api.put<Employee>(`/employees/${employeeId}`, payload).then((r) => r.data),
};

export type { UserRole };
