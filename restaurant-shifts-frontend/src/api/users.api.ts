import { api } from './client';

export const usersApi = {
  deleteMe: (confirmDeleteRestaurant?: boolean) =>
    api
      .delete<{ deleted: boolean }>('/users/me', {
        data: { confirm_delete_restaurant: confirmDeleteRestaurant },
      })
      .then((r) => r.data),
};
