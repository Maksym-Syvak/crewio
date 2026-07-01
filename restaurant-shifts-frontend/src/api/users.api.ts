import { api } from './client';
import type { User } from '@/types';

export interface ChangePasswordPayload {
  current_password?: string;
  password: string;
  password_confirm: string;
}

export const usersApi = {
  changePassword: (payload: ChangePasswordPayload) =>
    api.patch<User>('/users/password', payload).then((r) => r.data),

  deleteMe: (confirmDeleteRestaurant?: boolean) =>
    api
      .delete<{ deleted: boolean }>('/users/me', {
        data: { confirm_delete_restaurant: confirmDeleteRestaurant ?? false },
      })
      .then((r) => r.data),
};
