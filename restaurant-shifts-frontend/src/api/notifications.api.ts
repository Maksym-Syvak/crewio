import { api } from './client';
import type { Notification } from '@/types';

export const notificationsApi = {
  list: (userId?: string) =>
    api
      .get<Notification[]>('/notifications', { params: { userId } })
      .then((r) => r.data),

  markRead: (id: string) =>
    api.put<Notification>(`/notifications/${id}/read`).then((r) => r.data),
};
