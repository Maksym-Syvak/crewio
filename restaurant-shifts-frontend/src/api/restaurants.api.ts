import { api } from './client';
import type { Restaurant } from '@/types';

export const restaurantsApi = {
  list: (ownerId?: string) =>
    api
      .get<Restaurant[]>('/restaurants', { params: { ownerId } })
      .then((r) => r.data),

  get: (id: string) =>
    api.get<Restaurant>(`/restaurants/${id}`).then((r) => r.data),
};
