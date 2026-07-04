import { api } from './client';
import type { ReplacementRequest } from '@/types';

export const replacementsApi = {
  list: (shiftId?: string) =>
    api
      .get<ReplacementRequest[]>('/replacement', { params: { shiftId } })
      .then((r) => r.data),

  apply: (id: string, employee_id: string) =>
    api
      .post<ReplacementRequest>(`/replacement/${id}/apply`, { employee_id })
      .then((r) => r.data),
};
