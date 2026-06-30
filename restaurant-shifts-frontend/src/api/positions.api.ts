import { api } from './client';
import type { Position } from '@/types';

export const positionsApi = {
  list: (restaurantId?: string) =>
    api
      .get<Position[]>('/positions', { params: { restaurantId } })
      .then((r) => r.data),
};
