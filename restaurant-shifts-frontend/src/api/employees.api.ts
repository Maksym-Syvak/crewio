import { api } from './client';
import type { Employee, Restaurant } from '@/types';

export const employeesApi = {
  me: () =>
    api
      .get<{ employee: Employee | null; restaurant: Restaurant | null }>(
        '/employees/me',
      )
      .then((r) => r.data),

  list: (restaurantId?: string) =>
    api
      .get<Employee[]>('/employees', { params: { restaurantId } })
      .then((r) => r.data),

  get: (id: string) =>
    api.get<Employee>(`/employees/${id}`).then((r) => r.data),

  create: (data: Partial<Employee>) =>
    api.post<Employee>('/employees', data).then((r) => r.data),

  update: (id: string, data: Partial<Employee>) =>
    api.put<Employee>(`/employees/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/employees/${id}`),
};
