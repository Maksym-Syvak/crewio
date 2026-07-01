import { useAuthStore } from '@/store';
import { authApi } from '@/api/auth.api';
import { disconnectSocket } from '@/sockets/events';

/** Clears client session only — user data on server is preserved. */
export async function clearAppSession() {
  disconnectSocket();

  try {
    await authApi.logout();
  } catch {
    // JWT is stateless — local cleanup still proceeds
  }

  useAuthStore.getState().logout();

  await useAuthStore.persist.clearStorage();
}
