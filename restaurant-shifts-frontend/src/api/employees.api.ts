import { api } from './client';
import type { Employee } from '@/types';

export const employeesApi = {
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
