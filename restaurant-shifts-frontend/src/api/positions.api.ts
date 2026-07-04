import { api } from './client';
import type { Position } from '@/types';

export interface CreatePositionPayload {
  restaurant_id: string;
  name: string;
  hourly_rate?: number;
  shift_rate?: number;
}

export const positionsApi = {
  list: (restaurantId: string) =>
    api
      .get<Position[]>('/positions', { params: { restaurantId } })
      .then((r) => r.data),

  create: (payload: CreatePositionPayload) =>
    api.post<Position>('/positions', payload).then((r) => r.data),
};
