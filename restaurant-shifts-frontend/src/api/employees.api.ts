import { api } from './client';
import type {
  Employee,
  EmployeeProfile,
  PaginatedResponse,
  Restaurant,
} from '@/types';

export const employeesApi = {
  me: () =>
    api
      .get<{ employee: Employee | null; restaurant: Restaurant | null }>(
        '/employees/me',
      )
      .then((r) => r.data),

  list: (restaurantId?: string, page = 1, limit = 20) =>
    api
      .get<PaginatedResponse<Employee>>('/employees', {
        params: { restaurantId, page, limit },
      })
      .then((r) => r.data),

  profile: (employeeId: string) =>
    api.get<EmployeeProfile>(`/employees/${employeeId}/profile`).then((r) => r.data),
};
