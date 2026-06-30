import { api } from './client';
import type { Statistics } from '@/types';

export const statisticsApi = {
  list: (employeeId?: string, month?: string) =>
    api
      .get<Statistics[]>('/statistics', { params: { employeeId, month } })
      .then((r) => r.data),
};
