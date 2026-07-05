import { api } from './client';
import type { BookingType, PaymentType, Shift, ShiftStatus } from '@/types';

export interface CreateShiftPayload {
  restaurant_id: string;
  start_time: string;
  end_time: string;
  required_employees?: number;
  shift_type?: string;
  payment_type?: PaymentType;
  payment_rate?: number;
  shift_rate?: number;
  hourly_rate?: number;
  fixed_rate?: number;
}

export interface BookShiftPayload {
  employee_id: string;
  booking_type?: BookingType;
  booked_start_time?: string;
  booked_end_time?: string;
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

  update: (id: string, data: Partial<CreateShiftPayload & { required_employees?: number }>) =>
    api.put<Shift>(`/shifts/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/shifts/${id}`),

  book: (id: string, data: BookShiftPayload) =>
    api.post<Shift>(`/shifts/${id}/book`, data).then((r) => r.data),

  cannotMakeIt: (id: string, employee_id: string) =>
    api
      .post(`/shifts/${id}/cannot-make-it`, { employee_id })
      .then((r) => r.data),

  setUrgent: (id: string, urgent: boolean) =>
    api.patch<Shift>(`/shifts/${id}/urgent`, { urgent }).then((r) => r.data),
};

export type ScheduleMode = 'weekly' | 'rotation' | 'custom_cycle';
export type RotationPreset = '5_2' | '2_2' | '3_3' | 'custom';

export interface GenerateSchedulePayload {
  restaurant_id: string;
  mode: ScheduleMode;
  date_from: string;
  date_to: string;
  start_time: string;
  end_time: string;
  required_employees?: number;
  shift_type?: string;
  payment_type?: PaymentType;
  payment_rate?: number;
  shift_rate?: number;
  hourly_rate?: number;
  fixed_rate?: number;
  weekdays?: number[];
  preset?: RotationPreset;
  work_days?: number;
  rest_days?: number;
  skip_existing?: boolean;
}

export interface GenerateScheduleResult {
  created: number;
  skipped: number;
  total: number;
  shifts: Shift[];
}

export const scheduleApi = {
  generate: (payload: GenerateSchedulePayload) =>
    api
      .post<GenerateScheduleResult>('/shifts/generate', payload)
      .then((r) => r.data),
};
