import { api } from './client';
import type { InvitationToken, InvitePreview, Restaurant, RestaurantType } from '@/types';

export interface CreateRestaurantPayload {
  name: string;
  type: RestaurantType;
  address: string;
  city?: string;
  region?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  open_time?: string;
  close_time?: string;
  employees_limit?: number;
}

export const restaurantsApi = {
  list: (ownerId?: string) =>
    api
      .get<Restaurant[]>('/restaurants', { params: { ownerId } })
      .then((r) => r.data),

  get: (id: string) =>
    api.get<Restaurant>(`/restaurants/${id}`).then((r) => r.data),

  create: (data: CreateRestaurantPayload) =>
    api
      .post<{ restaurant: Restaurant; invitation: InvitationToken }>(
        '/restaurants',
        data,
      )
      .then((r) => r.data),

  getInvite: (restaurantId: string) =>
    api
      .get<InvitationToken | null>(`/restaurants/${restaurantId}/invite`)
      .then((r) => r.data),

  regenerateInvite: (restaurantId: string) =>
    api
      .post<InvitationToken>(`/restaurants/${restaurantId}/invite`)
      .then((r) => r.data),
};

export const inviteApi = {
  preview: (token: string) =>
    api.get<InvitePreview>(`/invite/${encodeURIComponent(token)}`).then((r) => r.data),

  join: (token: string) =>
    api
      .post<{ employee: unknown; restaurant: Restaurant }>(
        `/invite/${encodeURIComponent(token)}/join`,
      )
      .then((r) => r.data),
};
