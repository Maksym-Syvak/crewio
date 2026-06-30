import { api } from './client';
import type { Shift, ShiftStatus } from '@/types';

export interface CreateShiftPayload {
  restaurant_id: string;
  position_id: string;
  start_time: string;
  end_time: string;
  required_employees?: number;
  is_urgent?: boolean;
}

export const shiftsApi = {
  list: (params?: {
    restaurantId?: string;
    employeeId?: string;
    status?: ShiftStatus;
  }) => api.get<Shift[]>('/shifts', { params }).then((r) => r.data),

  get: (id: string) => api.get<Shift>(`/shifts/${id}`).then((r) => r.data),

  create: (data: CreateShiftPayload) =>
    api.post<Shift>('/shifts', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateShiftPayload>) =>
    api.put<Shift>(`/shifts/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/shifts/${id}`),

  book: (id: string, employee_id: string) =>
    api.post<Shift>(`/shifts/${id}/book`, { employee_id }).then((r) => r.data),

  cannotMakeIt: (id: string, employee_id: string) =>
    api
      .post(`/shifts/${id}/cannot-make-it`, { employee_id })
      .then((r) => r.data),
};
